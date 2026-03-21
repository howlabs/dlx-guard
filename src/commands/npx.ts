/**
 * npx command - Run npx with security check
 * Following gstack pattern: wrap command with pre-flight check
 */

import type { CommandHandler } from "../types.ts";
import { getPackageMetadata, parsePackageSpec } from "../lib/registry.ts";
import { assessRisk } from "../lib/risk-scoring.ts";
import { InvalidPackageSpecError } from "../errors.ts";
import { renderRiskAssessment, renderWarning, renderSuccess, renderError, Spinner } from "../ui/output.ts";

export const npxCommand: CommandHandler = async (context) => {
  const { packageName, restArgs, flags } = context;

  if (!packageName) {
    renderError("Package name is required");
    console.error("Usage: dlx-guard npx <package> [args...]");
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
      renderSuccess("Running npx...");
      return await runNpx(name, restArgs);
    }

    if (assessment.level === "MEDIUM") {
      if (flags.yes) {
        renderWarning("Running with medium risk (--yes flag provided)");
        return await runNpx(name, restArgs);
      }

      // Interactive prompt would go here
      // For MVP, just warn and exit
      renderWarning("Medium risk detected - use --yes to proceed");
      return 1;
    }

    // HIGH or CRITICAL
    if (flags.yes) {
      renderWarning("Running with high risk (--yes flag provided)");
      return await runNpx(name, restArgs);
    }

    renderError("High risk detected - not running. Use --yes to override.");
    return 2;
  } catch (error) {
    spinner.stop(`Error during security check`);
    throw error;
  }
};

/**
 * Execute npx with the given arguments
 */
async function runNpx(packageName: string, args: string[]): Promise<number> {
  const command = "npx";
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
