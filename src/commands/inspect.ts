/**
 * inspect command - Analyze a package for security risks
 * Following gstack pattern: clean command handler with structured output
 */

import type { CommandHandler } from "../types.ts";
import { getPackageMetadata, parsePackageSpec } from "../lib/registry.ts";
import { assessRisk, calculateRiskScore } from "../lib/risk-scoring.ts";
import { renderRiskAssessment, renderJsonOutput, renderError, renderSuccess, Spinner } from "../ui/output.ts";
import { setVerbose, logConfig, logRegistryRequest, logTiming, logMetadataDump, logRiskScoring } from "../lib/verbose.ts";
import { isPackageWhitelisted } from "../lib/config.ts";

export const inspectCommand: CommandHandler = async (context) => {
  const { packageName, flags } = context;

  // Set verbose mode based on flag
  setVerbose(flags.verbose);
  if (flags.verbose) {
    logConfig();
  }

  if (!packageName) {
    renderError("Package name is required");
    console.error("Usage: dlx-guard inspect <package>");
    return 1;
  }

  const startTime = Date.now();

  const spinner = new Spinner();
  spinner.start(`Fetching metadata for ${packageName}...`);

  try {
    const { name } = parsePackageSpec(packageName);

    // Check if package is whitelisted
    if (isPackageWhitelisted(name)) {
      spinner.stopAndPersist(`Fetched metadata for ${name}`);
      renderSuccess(`${name} is whitelisted - skipping risk assessment`);
      return 0;
    }

    if (flags.verbose) {
      logRegistryRequest(name);
    }

    const fetchStart = Date.now();
    const metadata = await getPackageMetadata(name);
    const fetchDuration = Date.now() - fetchStart;

    if (flags.verbose) {
      logTiming("Registry fetch", fetchDuration);
      logMetadataDump(metadata);
    }

    const contributions = calculateRiskScore(metadata);
    const assessment = assessRisk(metadata);

    if (flags.verbose) {
      logRiskScoring(assessment.score, assessment.level, contributions);
    }

    spinner.stopAndPersist(`Fetched metadata for ${name}`);

    if (flags.json) {
      renderJsonOutput({
        status: assessment.level === "LOW" ? "success" : "warning",
        risk: assessment,
        packageName: name,
      });
    } else {
      renderRiskAssessment(name, assessment);
    }

    const totalDuration = Date.now() - startTime;
    if (flags.verbose) {
      logTiming("Total execution", totalDuration);
    }

    // Return exit code based on risk level
    // 0 = low risk, 1 = medium+, 2 = high+
    if (assessment.level === "LOW") {
      return 0;
    } else if (assessment.level === "MEDIUM") {
      return 1;
    }
    return 2;
  } catch (error) {
    spinner.stop(`Error fetching metadata`);
    throw error; // Let global error handler deal with it
  }
};
