/**
 * Dependency tree analysis
 * Analyzes transitive dependencies to detect risks deep in the dependency tree
 */

import type { NpmPackageMetadata } from "../types.ts";

/**
 * Known malicious or high-risk packages
 * This is a curated list of packages that have been involved in security incidents
 */
const KNOWN_MALICIOUS = [
  "crossenv",
  "eslint-scope",
  "event-stream",
  "ua-parser-js",
  "flatmap-stream",
  "eslint-plugin-snapi",
];

/**
 * Suspicious dependency patterns
 */
const SUSPICIOUS_PATTERNS = [
  /^test-/, // Many typosquat packages use test- prefix
  /-cli$/, // Common in fake CLI tools
  /-dev$/, // Common in fake dev tools
  /^@types\/.+$/, // Some @types packages have been compromised
];

/**
 * Result of dependency tree analysis
 */
export interface DependencyTreeResult {
  /** Total direct dependency count */
  directCount: number;
  /** Whether any known malicious packages were found */
  hasKnownMalicious: boolean;
  /** Whether any suspicious patterns were detected */
  hasSuspiciousPatterns: boolean;
  /** List of flagged dependency names */
  flaggedDependencies: string[];
  /** Reason for the flag */
  reason?: string;
}

/**
 * Check if a dependency name matches a suspicious pattern
 */
function isSuspiciousDependency(depName: string): boolean {
  // Check against known malicious packages
  if (KNOWN_MALICIOUS.includes(depName)) {
    return true;
  }

  // Check against suspicious patterns
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(depName));
}

/**
 * Analyze dependency tree for suspicious packages
 * Note: This is a simplified analysis that only checks direct dependencies
 * Full transitive analysis would require recursive registry lookups
 */
export function analyzeDependencyTree(metadata: NpmPackageMetadata): DependencyTreeResult {
  const allDeps = {
    ...metadata.dependencies,
    ...metadata.devDependencies,
    ...metadata.peerDependencies,
    ...metadata.optionalDependencies,
  };

  const depNames = Object.keys(allDeps);
  const directCount = depNames.length;

  const flaggedDependencies: string[] = [];
  const knownMalicious: string[] = [];
  const suspicious: string[] = [];

  for (const depName of depNames) {
    if (KNOWN_MALICIOUS.includes(depName)) {
      knownMalicious.push(depName);
      flaggedDependencies.push(depName);
    } else if (isSuspiciousDependency(depName)) {
      suspicious.push(depName);
      flaggedDependencies.push(depName);
    }
  }

  const hasKnownMalicious = knownMalicious.length > 0;
  const hasSuspiciousPatterns = suspicious.length > 0;

  let reason: string | undefined;
  if (hasKnownMalicious) {
    reason = `Contains known malicious package(s): ${knownMalicious.join(", ")}`;
  } else if (hasSuspiciousPatterns) {
    reason = `Contains suspicious dependency pattern(s): ${suspicious.slice(0, 3).join(", ")}${suspicious.length > 3 ? "..." : ""}`;
  }

  return {
    directCount,
    hasKnownMalicious,
    hasSuspiciousPatterns,
    flaggedDependencies,
    reason,
  };
}

/**
 * Get risk score contribution from dependency tree analysis
 * Returns score contribution and reason if issues found, null otherwise
 */
export function getDependencyTreeRisk(metadata: NpmPackageMetadata): { score: number; reason: string } | null {
  const result = analyzeDependencyTree(metadata);

  if (!result.hasKnownMalicious && !result.hasSuspiciousPatterns) {
    return null;
  }

  // Score based on severity
  let score = 1; // Base score for suspicious patterns

  if (result.hasKnownMalicious) {
    score = 5; // Critical - known malicious packages
  } else if (result.flaggedDependencies.length >= 3) {
    score = 2; // Multiple suspicious dependencies
  }

  return {
    score,
    reason: result.reason || "Suspicious dependency patterns detected",
  };
}

/**
 * Check if a specific dependency is known to be malicious
 */
export function isKnownMaliciousDependency(depName: string): boolean {
  return KNOWN_MALICIOUS.includes(depName);
}
