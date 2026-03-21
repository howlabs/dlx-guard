/**
 * Publish frequency analysis
 * Detects suspicious burst publishing patterns that may indicate:
 * - Spam publishing
 * - Account compromise
 * - Automated attacks
 */

import type { NpmPackageMetadata } from "../types.ts";

/**
 * Result of publish frequency analysis
 */
export interface PublishFrequencyResult {
  /** Total number of published versions */
  totalVersions: number;
  /** Number of versions in the burst window (last 7 days) */
  recentVersions: number;
  /** Whether burst publishing was detected */
  isBurst: boolean;
  /** Reason for the burst flag */
  reason?: string;
  /** Versions per week (averaged over package lifetime) */
  versionsPerWeek: number;
}

/**
 * Time windows for analysis
 */
const BURST_WINDOW_DAYS = 7; // Check last 7 days for burst publishing
const BURST_THRESHOLD_VERSIONS = 10; // Flag if >10 versions in burst window
const SUSPICIOUS_VERSIONS_PER_DAY = 3; // Flag if >3 versions per day on average

/**
 * Extract all version timestamps from package metadata
 */
function extractVersionTimestamps(metadata: NpmPackageMetadata): Array<{ version: string; time: string }> {
  const time = metadata.time || {};
  const versions: Array<{ version: string; time: string }> = [];

  // Skip non-version entries like "created", "modified"
  for (const [key, value] of Object.entries(time)) {
    if (key !== "created" && key !== "modified" && typeof value === "string") {
      versions.push({ version: key, time: value });
    }
  }

  // Sort by time (newest first)
  versions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return versions;
}

/**
 * Count versions published within the burst window
 */
function countRecentVersions(versions: Array<{ version: string; time: string }>, windowDays: number): number {
  if (versions.length === 0) return 0;

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  let count = 0;
  for (const v of versions) {
    const timestamp = new Date(v.time).getTime();
    if (timestamp >= cutoff) {
      count++;
    } else {
      break; // Versions are sorted, so we can stop here
    }
  }

  return count;
}

/**
 * Analyze publish frequency for burst patterns
 */
export function analyzePublishFrequency(metadata: NpmPackageMetadata): PublishFrequencyResult {
  const versions = extractVersionTimestamps(metadata);
  const totalVersions = versions.length;

  // Count recent versions (last 7 days)
  const recentVersions = countRecentVersions(versions, BURST_WINDOW_DAYS);

  // Calculate versions per week over package lifetime
  const packageAgeMs = (metadata.weeks ?? 0) * 7 * 24 * 60 * 60 * 1000;
  const versionsPerWeek = packageAgeMs > 0
    ? (totalVersions / (packageAgeMs / (7 * 24 * 60 * 60 * 1000)))
    : totalVersions; // If age is unknown, assume 1 week

  // Detect burst publishing
  let isBurst = false;
  let reason: string | undefined;

  if (recentVersions >= BURST_THRESHOLD_VERSIONS) {
    isBurst = true;
    reason = `Published ${recentVersions} versions in the last ${BURST_WINDOW_DAYS} days (unusual burst publishing)`;
  } else if (recentVersions > 0) {
    // Calculate daily rate for recent versions
    const dailyRate = recentVersions / BURST_WINDOW_DAYS;
    if (dailyRate >= SUSPICIOUS_VERSIONS_PER_DAY) {
      isBurst = true;
      reason = `Publishing ${dailyRate.toFixed(1)} versions per day (suspicious rate)`;
    }
  }

  // Also flag if total version count is unusually high for a new package
  if (totalVersions > 50 && (metadata.weeks ?? 0) < 4) {
    isBurst = true;
    reason = `Published ${totalVersions} versions in a very short time (${(metadata.weeks ?? 0).toFixed(1)} weeks)`;
  }

  return {
    totalVersions,
    recentVersions,
    isBurst,
    reason,
    versionsPerWeek: Math.round(versionsPerWeek * 10) / 10,
  };
}

/**
 * Get risk score contribution from publish frequency
 * Returns score contribution and reason if burst detected, null otherwise
 */
export function getPublishFrequencyRisk(metadata: NpmPackageMetadata): { score: number; reason: string } | null {
  const result = analyzePublishFrequency(metadata);

  if (!result.isBurst) {
    return null;
  }

  // Score based on severity
  let score = 2; // Base score for burst publishing

  if (result.recentVersions >= 20) {
    score = 4; // Very suspicious
  } else if (result.recentVersions >= BURST_THRESHOLD_VERSIONS) {
    score = 3; // Suspicious
  }

  return {
    score,
    reason: result.reason || "Suspicious publishing pattern detected",
  };
}
