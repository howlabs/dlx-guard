#!/usr/bin/env bun
/**
 * dlx-guard - Security wrapper for npx/pnpm dlx/bunx
 *
 * Main CLI entry point following gstack patterns:
 * - Single binary output via Bun compile
 * - Command registry pattern
 * - Structured error handling
 */

import { parseArgs } from "node:util";
import { VERSION } from "./constants.ts";
import { COMMAND_REGISTRY } from "./commands.ts";
import { handleError } from "./errors.ts";
import { renderHelp } from "./ui/help.ts";
import { loadConfiguration, isVerboseByDefault } from "./lib/config.ts";

interface ParsedArgs {
  command?: string;
  package?: string;
  rest: string[];
  flags: {
    json: boolean;
    yes: boolean;
    help: boolean;
    version: boolean;
    verbose: boolean | null; // null = use config, true = force on, false = force off
    dryRun: boolean;
  };
}

/**
 * Parse command line arguments following POSIX conventions
 */
function parseCliArgs(args: string[]): ParsedArgs {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", short: "j" },
      yes: { type: "boolean", short: "y" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      verbose: { type: "boolean", short: "V" },
      "no-verbose": { type: "boolean" },
      "dry-run": { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  // Track verbose flag: null = use config default, true = force on, false = force off
  const verboseCli = values.verbose as boolean | undefined;
  const noVerbose = values["no-verbose"] as boolean | undefined;
  let verboseFlag: boolean | null = null;
  if (verboseCli) {
    verboseFlag = true;
  } else if (noVerbose) {
    verboseFlag = false;
  }

  const result: ParsedArgs = {
    rest: [],
    flags: {
      json: (values.json ?? false) as boolean,
      yes: (values.yes ?? false) as boolean,
      help: (values.help ?? false) as boolean,
      version: (values.version ?? false) as boolean,
      verbose: verboseFlag,
      dryRun: ((values["dry-run"] as boolean | undefined) ?? false),
    },
  };

  // Extract command and package
  const positional = positionals;
  if (positional.length > 0) {
    result.command = positional[0];
  }
  if (positional.length > 1) {
    result.package = positional[1];
  }
  result.rest = positional.slice(2);

  return result;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<number> {
  // Load configuration file first
  await loadConfiguration();

  const args = parseCliArgs(process.argv.slice(2));

  // Merge config file verbose setting with command-line flag
  // CLI flag takes precedence: null = use config, true = force on, false = force off
  let finalVerbose = args.flags.verbose;
  if (finalVerbose === null) {
    finalVerbose = isVerboseByDefault();
  }
  args.flags.verbose = finalVerbose;

  // Handle version flag
  if (args.flags.version) {
    console.log(`dlx-guard v${VERSION}`);
    return 0;
  }

  // Handle help flag
  if (args.flags.help) {
    renderHelp();
    return 0;
  }

  // No command provided - show help
  if (!args.command) {
    renderHelp();
    return 1;
  }

  // Check if command is supported
  const commandHandler = COMMAND_REGISTRY.get(args.command);
  if (!commandHandler) {
    console.error(`Unknown command: ${args.command}`);
    console.error("");
    renderHelp();
    return 1;
  }

  // Execute command
  return await commandHandler({
    packageName: args.package,
    restArgs: args.rest,
    flags: {
      json: args.flags.json,
      yes: args.flags.yes,
      help: args.flags.help,
      version: args.flags.version,
      verbose: finalVerbose, // Resolved to boolean
      dryRun: args.flags.dryRun,
    },
  });
}

// Error handling wrapper
process.exitCode = 1;

try {
  process.exitCode = await main();
} catch (error) {
  handleError(error);
  process.exitCode = 1;
}

export { main };
