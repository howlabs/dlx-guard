/**
 * inspect command - Analyze a package for security risks
 * Following gstack pattern: clean command handler with structured output
 */

import type { CommandHandler } from "../types.ts";
import { getPackageMetadata, parsePackageSpec } from "../lib/registry.ts";
import { assessRisk, riskAssessmentToJson } from "../lib/risk-scoring.ts";
import { InvalidPackageSpecError } from "../errors.ts";
import { renderRiskAssessment, renderJsonOutput, renderError, Spinner } from "../ui/output.ts";

export const inspectCommand: CommandHandler = async (context) => {
  const { packageName, flags } = context;

  if (!packageName) {
    renderError("Package name is required");
    console.error("Usage: dlx-guard inspect <package>");
    return 1;
  }

  const spinner = new Spinner();
  spinner.start(`Fetching metadata for ${packageName}...`);

  try {
    const { name } = parsePackageSpec(packageName);
    const metadata = await getPackageMetadata(name);
    const assessment = assessRisk(metadata);

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
