/**
 * Risk scoring engine
 * Following gstack pattern: rule-based, transparent scoring with clear reasoning
 * Per MVP spec: +3 for fresh package, +3 for install scripts, etc.
 */

import type { NpmPackageMetadata, RiskAssessment } from "../types.ts";
import {
  RISK_THRESHOLDS,
  RISK_SCORES,
  DEPENDENCY_THRESHOLDS,
} from "../constants.ts";
import { checkTyposquat } from "./typosquat.ts";

/**
 * Risk score contribution with explanation
 */
export interface ScoreContribution {
  score: number;
  reason: string;
}

/**
 * Calculate total dependency count
 */
function countDependencies(metadata: NpmPackageMetadata): number {
  const deps = Object.keys(metadata.dependencies || {}).length;
  const devDeps = Object.keys(metadata.devDependencies || {}).length;
  const peerDeps = Object.keys(metadata.peerDependencies || {}).length;
  const optionalDeps = Object.keys(metadata.optionalDependencies || {}).length;

  return deps + devDeps + peerDeps + optionalDeps;
}

/**
 * Check if package was published recently (within 24 hours)
 */
function isRecentlyPublished(metadata: NpmPackageMetadata): boolean {
  if (!metadata.weeks && metadata.weeks !== 0) {
    return false; // Unknown age - can't determine
  }

  // 24 hours = approximately 0.14 weeks
  return metadata.weeks < 0.15;
}

/**
 * Check if package has install scripts
 */
function hasInstallScripts(metadata: NpmPackageMetadata): boolean {
  const scripts = metadata.scripts || {};
  return !!(
    scripts.preinstall ||
    scripts.install ||
    scripts.postinstall ||
    scripts.preuninstall ||
    scripts.uninstall ||
    scripts.postuninstall
  );
}

/**
 * Check if maintainer history is weak
 * Weak = fewer than 2 maintainers OR package age < 4 weeks
 */
function hasWeakMaintainerHistory(metadata: NpmPackageMetadata): boolean {
  const maintainerCount = metadata.maintainers?.length || 0;
  const packageAge = metadata.weeks || 0;

  return maintainerCount < 2 || packageAge < 4;
}

/**
 * Check if dependency graph is abnormally large
 */
function hasLargeDependencyGraph(metadata: NpmPackageMetadata): boolean {
  const depCount = countDependencies(metadata);
  return depCount > DEPENDENCY_THRESHOLDS.HIGH;
}

/**
 * Check if metadata is sparse
 */
function hasSparseMetadata(metadata: NpmPackageMetadata): boolean {
  const hasDescription = !!(metadata as any).description;
  const hasHomepage = !!(metadata as any).homepage;
  const hasRepository = !!(metadata as any).repository;
  const hasKeywords = !!((metadata as any).keywords?.length > 0);

  // Sparse if missing most metadata fields
  const signalCount = [hasDescription, hasHomepage, hasRepository, hasKeywords].filter(
    Boolean
  ).length;

  return signalCount < 2;
}

/**
 * Calculate risk score and generate reasons
 */
export function calculateRiskScore(metadata: NpmPackageMetadata): ScoreContribution[] {
  const contributions: ScoreContribution[] = [];

  // Check 0: Typosquatting (được check đầu tiên vì high risk)
  const typosquatResult = checkTyposquat(metadata.name);
  if (typosquatResult.isTyposquat && typosquatResult.similarPackage) {
    contributions.push({
      score: RISK_SCORES.TYPOSQUATTING,
      reason: `Package name similar to popular package "${typosquatResult.similarPackage}" (possible typosquatting)`,
    });
  }

  // Check 1: Recently published package
  if (isRecentlyPublished(metadata)) {
    contributions.push({
      score: RISK_SCORES.PACKAGE_PUBLISHED_RECENTLY,
      reason: `Published very recently (${(metadata.weeks ?? 0) < 0.01 ? "< 1 day" : "~1 day"} ago)`,
    });
  } else if ((metadata.weeks ?? 0) < 1) {
    // Lower risk if 1-7 days old
    contributions.push({
      score: 1,
      reason: `Published recently (${Math.round((metadata.weeks ?? 0) * 7)} days ago)`,
    });
  }

  // Check 2: Install scripts
  if (hasInstallScripts(metadata)) {
    const scriptNames = [];
    if (metadata.scripts?.preinstall) scriptNames.push("preinstall");
    if (metadata.scripts?.install) scriptNames.push("install");
    if (metadata.scripts?.postinstall) scriptNames.push("postinstall");

    contributions.push({
      score: RISK_SCORES.HAS_INSTALL_SCRIPTS,
      reason: `Has install scripts that run automatically: ${scriptNames.join(", ")}`,
    });
  }

  // Check 3: Weak maintainer history
  if (hasWeakMaintainerHistory(metadata)) {
    const maintainerCount = metadata.maintainers?.length || 0;
    const ageWeeks = metadata.weeks || 0;

    if (maintainerCount < 2 && ageWeeks < 4) {
      contributions.push({
        score: RISK_SCORES.WEAK_OWNER_HISTORY,
        reason: `Limited maintainer history (${maintainerCount} maintainer${maintainerCount === 1 ? "" : "s"}, package age: ${ageWeeks.toFixed(1)} weeks)`,
      });
    }
  }

  // Check 4: Large dependency graph
  if (hasLargeDependencyGraph(metadata)) {
    const depCount = countDependencies(metadata);
    contributions.push({
      score: RISK_SCORES.LARGE_DEPENDENCY_GRAPH,
      reason: `Large dependency graph (${depCount} dependencies) - increases attack surface`,
    });
  }

  // Check 5: Sparse metadata
  if (hasSparseMetadata(metadata)) {
    contributions.push({
      score: RISK_SCORES.SPARSE_METADATA,
      reason: "Limited package metadata (no description, homepage, or repository)",
    });
  }

  return contributions;
}

/**
 * Determine risk level from score
 */
function scoreToLevel(score: number): RiskAssessment["level"] {
  if (score >= RISK_THRESHOLDS.HIGH) {
    return "CRITICAL";
  }
  if (score >= RISK_THRESHOLDS.MEDIUM) {
    return "HIGH";
  }
  if (score >= RISK_THRESHOLDS.LOW) {
    return "MEDIUM";
  }
  return "LOW";
}

/**
 * Generate recommendations based on risk assessment
 */
function generateRecommendations(
  level: RiskAssessment["level"],
  metadata: NpmPackageMetadata
): string[] {
  const recommendations: string[] = [];

  switch (level) {
    case "LOW":
      recommendations.push("Package appears safe to run");
      break;

    case "MEDIUM":
      recommendations.push("Review the package source before running if possible");
      recommendations.push("Consider pinning to an exact version");
      break;

    case "HIGH":
      recommendations.push("Run only if the source is trusted and verified");
      recommendations.push("Pin to exact version to avoid supply chain attacks");
      recommendations.push("Consider alternatives if available");
      break;

    case "CRITICAL":
      recommendations.push("DO NOT RUN - high risk of malicious behavior");
      recommendations.push("If you must run, review the full source code first");
      recommendations.push("Consider using a containerized environment");
      break;
  }

  // Add specific recommendations based on detected issues
  if (hasInstallScripts(metadata)) {
    recommendations.push("Install scripts will run automatically - review package.json scripts");
  }

  if (isRecentlyPublished(metadata)) {
    recommendations.push("Very new package - wait for community adoption if possible");
  }

  return recommendations;
}

/**
 * Assess package risk
 * Main entry point for risk scoring
 */
export function assessRisk(metadata: NpmPackageMetadata): RiskAssessment {
  const contributions = calculateRiskScore(metadata);
  const totalScore = contributions.reduce((sum, c) => sum + c.score, 0);
  const level = scoreToLevel(totalScore);

  const reasons = contributions.map((c) => c.reason);
  const recommendations = generateRecommendations(level, metadata);

  return {
    level,
    score: totalScore,
    reasons,
    recommendations,
  };
}

/**
 * Format risk assessment for JSON output
 */
export function riskAssessmentToJson(
  packageName: string,
  assessment: RiskAssessment,
  metadata: NpmPackageMetadata
): Record<string, unknown> {
  return {
    package: packageName,
    version: metadata.version,
    risk: {
      level: assessment.level,
      score: assessment.score,
      reasons: assessment.reasons,
      recommendations: assessment.recommendations,
    },
    metadata: {
      publishedAt: metadata.time?.[metadata.version],
      ageWeeks: metadata.weeks,
      maintainers: metadata.maintainers?.length || 0,
      hasInstallScripts: hasInstallScripts(metadata),
      dependencyCount: countDependencies(metadata),
    },
  };
}
