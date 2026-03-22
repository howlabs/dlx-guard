/**
 * Dependency tree analysis
 * Analyzes transitive dependencies to detect risks deep in the dependency tree
 */

import type { NpmPackageMetadata } from "../types.ts";
import { getKnownMaliciousPackages, type MaliciousPackage } from "./data-loader.ts";

// Cached malicious packages for synchronous access
let cachedMaliciousPackages: Set<string> | null = null;
let cachedMaliciousDetails: Map<string, MaliciousPackage> | null = null;

/**
 * Initialize the cached malicious packages data
 * Call this early (e.g., during app startup) for synchronous access later
 */
export async function initializeMaliciousData(): Promise<void> {
  if (!cachedMaliciousPackages) {
    const packages = await getKnownMaliciousPackages();
    cachedMaliciousPackages = new Set(packages.map((p) => p.name));
    cachedMaliciousDetails = new Map(packages.map((p) => [p.name, p]));
  }
}

/**
 * Ensure malicious packages are loaded (lazy initialization)
 */
async function ensureMaliciousDataLoaded(): Promise<void> {
  if (!cachedMaliciousPackages) {
    await initializeMaliciousData();
  }
}

/**
 * Suspicious dependency patterns
 */
const SUSPICIOUS_PATTERNS = [
  /^test-/, // Many typosquat packages use test- prefix
  /-cli$/, // Common in fake CLI tools
  /-dev$/, // Common in fake dev tools
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
  /** Details about malicious packages found */
  maliciousDetails?: Array<{ name: string; reason: string }>;
}

/**
 * Check if a dependency name matches a suspicious pattern
 */
function isSuspiciousDependency(depName: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(depName));
}

/**
 * Synchronous check if a specific dependency is known to be malicious
 * Requires prior initialization via initializeMaliciousData()
 */
export function isKnownMaliciousDependencySync(depName: string): boolean {
  return cachedMaliciousPackages?.has(depName) ?? false;
}

/**
 * Async check if a specific dependency is known to be malicious
 * Loads data on demand if not yet initialized
 */
export async function isKnownMaliciousDependency(depName: string): Promise<boolean> {
  await ensureMaliciousDataLoaded();
  return cachedMaliciousPackages?.has(depName) ?? false;
}

/**
 * Get details about a known malicious package
 */
export function getMaliciousPackageDetails(depName: string): MaliciousPackage | undefined {
  return cachedMaliciousDetails?.get(depName);
}

/**
 * Analyze dependency tree for suspicious packages
 * Note: This is a simplified analysis that only checks direct dependencies
 * Full transitive analysis would require recursive registry lookups
 */
export async function analyzeDependencyTree(
  metadata: NpmPackageMetadata
): Promise<DependencyTreeResult> {
  await ensureMaliciousDataLoaded();

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
  const maliciousDetails: Array<{ name: string; reason: string }> = [];

  for (const depName of depNames) {
    if (cachedMaliciousPackages?.has(depName)) {
      knownMalicious.push(depName);
      flaggedDependencies.push(depName);
      const details = cachedMaliciousDetails?.get(depName);
      if (details) {
        maliciousDetails.push({
          name: depName,
          reason: details.reason,
        });
      }
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
    maliciousDetails,
  };
}

/**
 * Synchronous version of analyzeDependencyTree (requires prior initialization)
 * Use this after calling initializeMaliciousData() during app startup
 */
export function analyzeDependencyTreeSync(
  metadata: NpmPackageMetadata
): DependencyTreeResult {
  if (!cachedMaliciousPackages || !cachedMaliciousDetails) {
    // Not initialized, return safe default
    return {
      directCount: Object.keys(metadata.dependencies || {}).length,
      hasKnownMalicious: false,
      hasSuspiciousPatterns: false,
      flaggedDependencies: [],
    };
  }

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
  const maliciousDetails: Array<{ name: string; reason: string }> = [];

  for (const depName of depNames) {
    if (cachedMaliciousPackages.has(depName)) {
      knownMalicious.push(depName);
      flaggedDependencies.push(depName);
      const details = cachedMaliciousDetails.get(depName);
      if (details) {
        maliciousDetails.push({
          name: depName,
          reason: details.reason,
        });
      }
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
    maliciousDetails,
  };
}

/**
 * Get risk score contribution from dependency tree analysis
 * Returns score contribution and reason if issues found, null otherwise
 */
export async function getDependencyTreeRisk(
  metadata: NpmPackageMetadata
): Promise<{ score: number; reason: string } | null> {
  const result = await analyzeDependencyTree(metadata);

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
