/**
 * Verbose debug output utilities
 * Provides detailed debugging information for troubleshooting
 */

import type { NpmPackageMetadata } from "../types.ts";
import { NPM_REGISTRY, CACHE_DIR, CACHE_TTL } from "../constants.ts";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
} as const;

/**
 * Check if verbose mode is enabled
 */
let verboseEnabled = false;

export function setVerbose(enabled: boolean): void {
  verboseEnabled = enabled;
}

export function isVerbose(): boolean {
  return verboseEnabled;
}

/**
 * Log verbose message (only shows when verbose mode is enabled)
 */
export function verboseLog(category: string, message: string): void {
  if (!verboseEnabled) return;

  const timestamp = new Date().toISOString();
  console.error(`${COLORS.dim}[${timestamp}]${COLORS.reset} ${COLORS.cyan}[${category}]${COLORS.reset} ${message}`);
}

/**
 * Log registry request details
 */
export function logRegistryRequest(packageName: string): void {
  if (!verboseEnabled) return;

  const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;
  verboseLog("registry", `Fetching metadata from: ${COLORS.cyan}${url}${COLORS.reset}`);
}

/**
 * Log cache hit/miss
 */
export function logCacheHit(packageName: string, hit: boolean): void {
  if (!verboseEnabled) return;

  if (hit) {
    verboseLog("cache", `${COLORS.green}HIT${COLORS.reset} for ${COLORS.cyan}${packageName}${COLORS.reset}`);
  } else {
    verboseLog("cache", `${COLORS.yellow}MISS${COLORS.reset} for ${COLORS.cyan}${packageName}${COLORS.reset}`);
  }
}

/**
 * Log timing information
 */
export function logTiming(operation: string, durationMs: number): void {
  if (!verboseEnabled) return;

  const duration = durationMs >= 1000
    ? `${(durationMs / 1000).toFixed(2)}s`
    : `${durationMs.toFixed(0)}ms`;

  verboseLog("timing", `${operation} took ${COLORS.cyan}${duration}${COLORS.reset}`);
}

/**
 * Log configuration details
 */
export function logConfig(): void {
  if (!verboseEnabled) return;

  console.error("");
  console.error(`${COLORS.dim}=== Configuration ===${COLORS.reset}`);
  console.error(`${COLORS.dim}Registry:${COLORS.reset} ${NPM_REGISTRY}`);
  console.error(`${COLORS.dim}Cache Dir:${COLORS.reset} ${CACHE_DIR}`);
  console.error(`${COLORS.dim}Cache TTL:${COLORS.reset} ${CACHE_TTL}ms (${(CACHE_TTL / 1000 / 60).toFixed(0)}min)`);
  console.error("");
}

/**
 * Log raw metadata dump
 */
export function logMetadataDump(metadata: NpmPackageMetadata): void {
  if (!verboseEnabled) return;

  console.error("");
  console.error(`${COLORS.dim}=== Raw Metadata ===${COLORS.reset}`);
  console.error(`${COLORS.dim}Name:${COLORS.reset} ${metadata.name}`);
  console.error(`${COLORS.dim}Version:${COLORS.reset} ${metadata.version}`);
  console.error(`${COLORS.dim}Age:${COLORS.reset} ${metadata.weeks?.toFixed(1) ?? "unknown"} weeks`);

  if (metadata.time) {
    const created = metadata.time.created || "unknown";
    const modified = metadata.time[metadata.version] || "unknown";
    console.error(`${COLORS.dim}Created:${COLORS.reset} ${created}`);
    console.error(`${COLORS.dim}Modified:${COLORS.reset} ${modified}`);
  }

  if (metadata.maintainers) {
    console.error(`${COLORS.dim}Maintainers:${COLORS.reset} ${metadata.maintainers.map((m) => m.name).join(", ")}`);
  }

  const depCount = Object.keys(metadata.dependencies || {}).length;
  const devDepCount = Object.keys(metadata.devDependencies || {}).length;
  const peerDepCount = Object.keys(metadata.peerDependencies || {}).length;

  console.error(`${COLORS.dim}Dependencies:${COLORS.reset} ${depCount}`);
  console.error(`${COLORS.dim}DevDependencies:${COLORS.reset} ${devDepCount}`);
  console.error(`${COLORS.dim}PeerDependencies:${COLORS.reset} ${peerDepCount}`);
  console.error("");
}

/**
 * Log risk scoring details
 */
export function logRiskScoring(
  score: number,
  level: string,
  contributions: Array<{ score: number; reason: string }>
): void {
  if (!verboseEnabled) return;

  console.error("");
  console.error(`${COLORS.dim}=== Risk Scoring ===${COLORS.reset}`);
  console.error(`${COLORS.dim}Total Score:${COLORS.reset} ${score}/10`);
  console.error(`${COLORS.dim}Risk Level:${COLORS.reset} ${level}`);

  if (contributions.length > 0) {
    console.error(`${COLORS.dim}Contributions:${COLORS.reset}`);
    for (const c of contributions) {
      console.error(`  ${COLORS.dim}+${c.score}${COLORS.reset} ${c.reason}`);
    }
  }
  console.error("");
}

/**
 * Log command execution details
 */
export function logCommandExecution(command: string, packageName: string, args: string[]): void {
  if (!verboseEnabled) return;

  console.error("");
  console.error(`${COLORS.dim}=== Command Execution ===${COLORS.reset}`);
  console.error(`${COLORS.dim}Command:${COLORS.reset} ${command}`);
  console.error(`${COLORS.dim}Package:${COLORS.reset} ${packageName}`);
  if (args.length > 0) {
    console.error(`${COLORS.dim}Args:${COLORS.reset} ${args.join(" ")}`);
  }
  console.error("");
}
