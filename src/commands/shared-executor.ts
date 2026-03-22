/**
 * Shared executor for npx/pnpm-dlx/bunx commands
 * Following gstack pattern: eliminate code duplication with strategy pattern
 */

import type { CommandHandler } from "../types.ts";
import { getPackageMetadata, parsePackageSpec } from "../lib/registry.ts";
import { assessRisk } from "../lib/risk-scoring.ts";
import { promptConfirm, restoreStdin } from "../lib/prompt.ts";
import { renderRiskAssessment, renderWarning, renderSuccess, renderError, Spinner, COLORS } from "../ui/output.ts";

/**
 * Executor strategy - defines how to run each package manager
 */
export interface ExecutorStrategy {
  /** Display name of the command */
  name: string;
  /** Command to execute */
  command: string;
  /** Build command arguments from package and rest args */
  buildArgs(packageName: string, restArgs: string[]): string[];
  /** Usage string for error messages */
  usage: string;
}

/**
 * Executor strategies for each package manager
 */
export const EXECUTORS: Record<string, ExecutorStrategy> = {
  npx: {
    name: "npx",
    command: "npx",
    buildArgs: (pkg, args) => [pkg, ...args],
    usage: "dlx-guard npx <package> [args...]",
  },
  "pnpm-dlx": {
    name: "pnpm dlx",
    command: "pnpm",
    buildArgs: (pkg, args) => ["dlx", pkg, ...args],
    usage: "dlx-guard pnpm dlx <package> [args...]",
  },
  bunx: {
    name: "bunx",
    command: "bunx",
    buildArgs: (pkg, args) => [pkg, ...args],
    usage: "dlx-guard bunx <package> [args...]",
  },
};

/**
 * Create a security-wrapped command handler for a package manager
 *
 * This is the core shared logic that all executor commands use:
 * 1. Parse package name
 * 2. Fetch metadata and assess risk
 * 3. Show risk assessment
 * 4. Handle dry-run mode
 * 5. Execute based on risk level (auto-run, prompt, or block)
 *
 * @param strategy - Executor strategy for the package manager
 * @returns Command handler function
 */
export const createSecurityWrappedHandler = (
  strategy: ExecutorStrategy
): CommandHandler => async (context) => {
  const { packageName, restArgs, flags } = context;

  if (!packageName) {
    renderError("Package name is required");
    console.error(`Usage: ${strategy.usage}`);
    return 1;
  }

  const spinner = new Spinner();
  spinner.start(`Checking ${packageName} for security risks...`);

  try {
    const { name } = parsePackageSpec(packageName);
    const metadata = await getPackageMetadata(name);
    const assessment = assessRisk(metadata);

    spinner.stop(`Security check complete`);

    renderRiskAssessment(name, assessment);

    // Dry run mode - show what would happen without executing
    if (flags.dryRun) {
      console.log("");
      console.log(`${COLORS.dim}Dry run mode - not executing${COLORS.reset}`);
      const commandArgs = strategy.buildArgs(name, restArgs);
      console.log(`Would run: ${COLORS.cyan}${strategy.command} ${commandArgs.join(" ")}${COLORS.reset}`);
      return 0;
    }

    // Decision based on risk level
    if (assessment.level === "LOW") {
      renderSuccess(`Running ${strategy.name}...`);
      return await runCommand(strategy.command, strategy.buildArgs(name, restArgs));
    }

    if (assessment.level === "MEDIUM") {
      if (flags.yes) {
        renderWarning(`Running with medium risk (--yes flag provided)`);
        return await runCommand(strategy.command, strategy.buildArgs(name, restArgs));
      }

      // Interactive prompt for MEDIUM risk
      console.log("");
      const shouldProceed = await promptConfirm("Continue anyway?", false);
      restoreStdin();

      if (!shouldProceed) {
        renderWarning("Aborted by user");
        return 1;
      }

      renderWarning("Proceeding with medium risk package");
      return await runCommand(strategy.command, strategy.buildArgs(name, restArgs));
    }

    // HIGH or CRITICAL
    if (flags.yes) {
      renderWarning(`Running with high risk (--yes flag provided)`);
      return await runCommand(strategy.command, strategy.buildArgs(name, restArgs));
    }

    renderError("High risk detected - not running. Use --yes to override.");
    return 2;
  } catch (error) {
    spinner.stop(`Error during security check`);
    throw error;
  }
};

/**
 * Execute a command with the given arguments
 *
 * @param command - Command to execute
 * @param args - Arguments to pass to the command
 * @returns Exit code from the command
 */
async function runCommand(command: string, args: string[]): Promise<number> {
  console.log(`$ ${command} ${args.join(" ")}`);

  const proc = Bun.spawn([command, ...args], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const exitCode = await proc.exited;
  return exitCode;
}

/**
 * Create a command handler for a specific executor strategy
 * Convenience function to create handlers for npx, pnpm-dlx, bunx
 *
 * @param strategy - Executor strategy for the package manager
 * @returns Command handler function
 */
export function createExecutorHandler(strategy: ExecutorStrategy): CommandHandler {
  return createSecurityWrappedHandler(strategy);
}
