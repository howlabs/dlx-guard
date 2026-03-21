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

interface ParsedArgs {
  command?: string;
  package?: string;
  rest: string[];
  flags: {
    json: boolean;
    yes: boolean;
    help: boolean;
    version: boolean;
  };
}

/**
 * Parse command line arguments following POSIX conventions
 */
function parseCliArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    rest: [],
    flags: {
      json: false,
      yes: false,
      help: false,
      version: false,
    },
  };

  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", short: "j" },
      yes: { type: "boolean", short: "y" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
    strict: false,
  });

  result.flags = {
    json: values.json as boolean,
    yes: values.yes as boolean,
    help: values.help as boolean,
    version: values.version as boolean,
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
  const args = parseCliArgs(process.argv.slice(2));

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
    flags: args.flags,
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
