/**
 * Deep dependency scan
 * Analyzes transitive dependencies to detect risks deep in the dependency tree
 *
 * This module performs recursive analysis of the dependency tree,
 * checking each transitive dependency for security risks.
 */

import type { NpmPackageMetadata } from "../types.ts";
import { getPackageMetadata } from "./registry.ts";
import { analyzeDependencyTreeSync, isKnownMaliciousDependencySync } from "./dependency-tree.ts";
import { checkTyposquatSync } from "./typosquat.ts";
import { verboseLog } from "./verbose.ts";
import { CACHE_DIR } from "../constants.ts";

/** Default scan depth limit */
const DEFAULT_MAX_DEPTH = 2;

/** Default scan timeout (30 seconds) */
const DEFAULT_TIMEOUT = 30000;

/** Cache TTL for deep scan results (24 hours) */
const DEEP_SCAN_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Deep scan options
 */
export interface DeepScanOptions {
  /** Maximum depth to scan (default: 2) */
  maxDepth?: number;
  /** Scan timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Include dev dependencies (default: false) */
  includeDev?: boolean;
  /** Skip cache (default: false) */
  skipCache?: boolean;
}

/**
 * Deep scan result
 */
export interface DeepScanResult {
  /** Root package name that was scanned */
  rootPackage: string;
  /** Total unique packages scanned */
  totalPackages: number;
  /** Maximum depth reached */
  maxDepthReached: boolean;
  /** Actual maximum depth reached */
  actualMaxDepth: number;
  /** Packages flagged for security issues */
  flaggedPackages: FlaggedPackage[];
  /** Whether the scan timed out */
  timedOut: boolean;
  /** Scan duration in milliseconds */
  duration: number;
}

/**
 * Flagged package information
 */
export interface FlaggedPackage {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Depth in dependency tree (0 = root) */
  depth: number;
  /** Reasons this package was flagged */
  reasons: string[];
  /** Risk score contribution */
  riskScore: number;
}

/**
 * Scan state for tracking progress
 */
interface ScanState {
  visited: Set<string>;
  flagged: FlaggedPackage[];
  currentMaxDepth: number;
  startTime: number;
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

/**
 * Deep dependency scan
 *
 * @param packageName - Root package name to scan
 * @param options - Scan options
 * @returns Deep scan result
 */
export async function deepDependencyScan(
  packageName: string,
  options: DeepScanOptions = {}
): Promise<DeepScanResult> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const state: ScanState = {
    visited: new Set(),
    flagged: [],
    currentMaxDepth: 0,
    startTime,
    controller,
    timeoutId,
  };

  try {
    // Check cache first
    if (!options.skipCache) {
      const cached = await loadFromCache(packageName, maxDepth);
      if (cached) {
        clearTimeout(timeoutId);
        return cached;
      }
    }

    // Start recursive scan
    await scanRecursive(
      packageName,
      0,
      maxDepth,
      state,
      options.includeDev ?? false
    );

    clearTimeout(timeoutId);

    const result: DeepScanResult = {
      rootPackage: packageName,
      totalPackages: state.visited.size,
      maxDepthReached: state.currentMaxDepth >= maxDepth,
      actualMaxDepth: state.currentMaxDepth,
      flaggedPackages: state.flagged,
      timedOut: false,
      duration: Date.now() - startTime,
    };

    // Cache the result
    await saveToCache(packageName, maxDepth, result);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === "AbortError") {
      // Timeout - return partial results
      return {
        rootPackage: packageName,
        totalPackages: state.visited.size,
        maxDepthReached: state.currentMaxDepth >= maxDepth,
        actualMaxDepth: state.currentMaxDepth,
        flaggedPackages: state.flagged,
        timedOut: true,
        duration: Date.now() - startTime,
      };
    }

    throw error;
  }
}

/**
 * Recursive dependency scanning
 */
async function scanRecursive(
  packageName: string,
  currentDepth: number,
  maxDepth: number,
  state: ScanState,
  includeDev: boolean
): Promise<void> {
  // Check for abort
  if (state.controller.signal.aborted) {
    throw new Error("AbortError");
  }

  // Update max depth
  if (currentDepth > state.currentMaxDepth) {
    state.currentMaxDepth = currentDepth;
  }

  // Skip if we've exceeded max depth
  if (currentDepth > maxDepth) {
    return;
  }

  // Create unique key for this package (version-agnostic for simplicity)
  const cacheKey = packageName;
  if (state.visited.has(cacheKey)) {
    return; // Already visited
  }
  state.visited.add(cacheKey);

  try {
    // Fetch package metadata
    const metadata = await getPackageMetadata(packageName, true);

    // Check this package for security issues
    const reasons: string[] = [];
    let riskScore = 0;

    // Check 1: Known malicious package
    if (isKnownMaliciousDependencySync(packageName)) {
      reasons.push("Known malicious package");
      riskScore += 5;
    }

    // Check 2: Typosquatting
    const typosquatResult = checkTyposquatSync(packageName);
    if (typosquatResult.isTyposquat) {
      reasons.push(
        `Similar to popular package "${typosquatResult.similarPackage}" (typosquatting)`
      );
      riskScore += 3;
    }

    // Check 3: Suspicious dependency patterns
    const depTreeResult = analyzeDependencyTreeSync(metadata);
    if (depTreeResult.hasKnownMalicious || depTreeResult.hasSuspiciousPatterns) {
      reasons.push(depTreeResult.reason || "Suspicious dependency patterns");
      riskScore += 2;
    }

    // Add to flagged if issues found
    if (reasons.length > 0) {
      state.flagged.push({
        name: packageName,
        version: metadata.version,
        depth: currentDepth,
        reasons,
        riskScore,
      });
    }

    // Get dependencies to recurse into
    const deps = {
      ...metadata.dependencies,
      ...(includeDev ? metadata.devDependencies : {}),
    };

    // Recurse into dependencies (with concurrency limit)
    const depEntries = Object.entries(deps);
    const concurrencyLimit = 5; // Limit concurrent requests

    for (let i = 0; i < depEntries.length; i += concurrencyLimit) {
      const batch = depEntries.slice(i, i + concurrencyLimit);
      await Promise.all(
        batch.map(([depName]) =>
          scanRecursive(depName, currentDepth + 1, maxDepth, state, includeDev)
        )
      );
    }
  } catch (error) {
    // Log error but continue scanning other branches
    verboseLog("deepscan", `Error scanning ${packageName}: ${(error as Error).message}`);
  }
}

/**
 * Calculate risk score contribution from deep scan
 *
 * @param result - Deep scan result
 * @returns Risk score contribution or null
 */
export function getDeepScanRisk(result: DeepScanResult): {
  score: number;
  reason: string;
} | null {
  if (result.flaggedPackages.length === 0) {
    return null;
  }

  // Count critical packages (riskScore >= 5)
  const criticalCount = result.flaggedPackages.filter((p) => p.riskScore >= 5).length;

  if (criticalCount > 0) {
    return {
      score: Math.min(5, criticalCount),
      reason: `Deep scan: Found ${criticalCount} critical risk package(s) in dependency tree`,
    };
  }

  // Count medium-high risk packages (riskScore >= 2)
  const mediumCount = result.flaggedPackages.filter((p) => p.riskScore >= 2).length;

  if (mediumCount >= 5) {
    return {
      score: 3,
      reason: `Deep scan: Found ${mediumCount} suspicious package(s) in dependency tree`,
    };
  }

  if (mediumCount > 0) {
    return {
      score: 1,
      reason: `Deep scan: Found ${mediumCount} package(s) with minor risk indicators`,
    };
  }

  return {
    score: 1,
    reason: `Deep scan: Found ${result.flaggedPackages.length} package(s) flagged in dependency tree`,
  };
}

/**
 * Format deep scan result for display
 */
export function formatDeepScanResult(result: DeepScanResult): string {
  const lines: string[] = [];

  lines.push(`\nDeep Scan Results:`);
  lines.push(`  Total packages scanned: ${result.totalPackages}`);
  lines.push(`  Max depth: ${result.actualMaxDepth}`);
  lines.push(`  Flagged packages: ${result.flaggedPackages.length}`);

  if (result.timedOut) {
    lines.push(`  ⚠️  Scan timed out after ${result.duration}ms (partial results)`);
  }

  if (result.flaggedPackages.length > 0) {
    lines.push(`\n  Flagged Packages:`);
    for (const pkg of result.flaggedPackages) {
      const depthIndicator = "  ".repeat(pkg.depth + 1);
      lines.push(`${depthIndicator}⚠ ${pkg.name}@${pkg.version} (depth: ${pkg.depth})`);
      for (const reason of pkg.reasons) {
        lines.push(`${depthIndicator}  - ${reason}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Load deep scan result from cache
 */
async function loadFromCache(
  packageName: string,
  maxDepth: number
): Promise<DeepScanResult | null> {
  const cachePath = `${CACHE_DIR}/deep-scan/${packageName}_${maxDepth}.json`;

  try {
    const file = Bun.file(cachePath);
    if (!file.size) return null;

    const raw = await file.text();
    const cached = JSON.parse(raw) as { result: DeepScanResult; cachedAt: number };

    // Check TTL
    if (Date.now() - cached.cachedAt > DEEP_SCAN_CACHE_TTL) {
      return null;
    }

    return cached.result;
  } catch {
    return null;
  }
}

/**
 * Save deep scan result to cache
 */
async function saveToCache(
  packageName: string,
  maxDepth: number,
  result: DeepScanResult
): Promise<void> {
  const cachePath = `${CACHE_DIR}/deep-scan/${packageName}_${maxDepth}.json`;

  try {
    const fs = await import("node:fs/promises");
    await fs.mkdir(`${CACHE_DIR}/deep-scan`, { recursive: true });

    const toSave = {
      result,
      cachedAt: Date.now(),
    };

    // Atomic write
    const tmpPath = `${cachePath}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, JSON.stringify(toSave));
    await fs.rename(tmpPath, cachePath);
  } catch {
    // Cache write failures are non-fatal
  }
}

/**
 * Clear deep scan cache
 */
export async function clearDeepScanCache(): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    await fs.rm(`${CACHE_DIR}/deep-scan`, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}
