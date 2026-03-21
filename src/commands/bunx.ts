/**
 * bunx command - Run bunx with security check
 * Following gstack pattern: consistent with npx/pnpm commands
 */

import type { CommandHandler } from "../types.ts";
import { getPackageMetadata, parsePackageSpec } from "../lib/registry.ts";
import { assessRisk } from "../lib/risk-scoring.ts";
import { promptConfirm, restoreStdin } from "../lib/prompt.ts";
import { renderRiskAssessment, renderWarning, renderSuccess, renderError, Spinner } from "../ui/output.ts";

export const bunxCommand: CommandHandler = async (context) => {
  const { packageName, restArgs, flags } = context;

  if (!packageName) {
    renderError("Package name is required");
    console.error("Usage: dlx-guard bunx <package> [args...]");
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

    // Decision based on risk level
    if (assessment.level === "LOW") {
      renderSuccess("Running bunx...");
      return await runBunx(name, restArgs);
    }

    if (assessment.level === "MEDIUM") {
      if (flags.yes) {
        renderWarning("Running with medium risk (--yes flag provided)");
        return await runBunx(name, restArgs);
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
      return await runBunx(name, restArgs);
    }

    // HIGH or CRITICAL
    if (flags.yes) {
      renderWarning("Running with high risk (--yes flag provided)");
      return await runBunx(name, restArgs);
    }

    renderError("High risk detected - not running. Use --yes to override.");
    return 2;
  } catch (error) {
    spinner.stop(`Error during security check`);
    throw error;
  }
};

/**
 * Execute bunx with the given arguments
 */
async function runBunx(packageName: string, args: string[]): Promise<number> {
  const command = "bunx";
  const commandArgs = [packageName, ...args];

  console.log(`$ ${command} ${commandArgs.join(" ")}`);

  const proc = Bun.spawn([command, ...commandArgs], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const exitCode = await proc.exited;
  return exitCode;
}
