/**
 * OSV (Open Source Vulnerabilities) API integration
 *
 * OSV is an open-source vulnerability database hosted by Google.
 * It aggregates vulnerabilities from multiple sources including npm.
 *
 * API Documentation: https://osv.dev/docs
 */

import { verboseLog } from "./verbose.ts";
import { CACHE_DIR } from "../constants.ts";

/** OSV API base URL */
const OSV_API = "https://api.osv.dev/v1";

/** Cache TTL for advisories (7 days - vulnerabilities don't change frequently) */
const ADVISORY_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * OSV advisory structure
 */
export interface OsvAdvisory {
  id: string;
  summary: string;
  details?: string;
  severity: Array<{
    type: string;
    score: string;
  }>;
  affected: Array<{
    package: {
      name: string;
      ecosystem: string;
    };
    versions: string[];
  }>;
  references?: Array<{
    type: string;
    url: string;
  }>;
  published: string;
  modified: string;
}

/**
 * OSV query response
 */
interface OsvQueryResponse {
  vulns: OsvAdvisory[];
}

/**
 * OSV query request
 */
interface OsvQueryRequest {
  package: {
    name: string;
    ecosystem: string;
  };
  version?: string;
}

/**
 * Check for advisories using OSV API
 *
 * @param packageName - npm package name
 * @param version - Package version (optional, checks all versions if not provided)
 * @returns Object with vulnerability information
 */
export async function checkOsvAdvisories(
  packageName: string,
  version?: string
): Promise<{
  hasVulnerabilities: boolean;
  advisories: OsvAdvisory[];
}> {
  const cacheKey = `${packageName}${version ? `@${version}` : ""}`;
  const cachePath = `${CACHE_DIR}/advisories/${cacheKey}.json`;

  // Try cache first
  const cached = await loadFromCache<OsvQueryResponse>(cachePath);
  if (cached) {
    verboseLog("osv", `Cache hit for ${packageName}`);
    return {
      hasVulnerabilities: cached.vulns.length > 0,
      advisories: cached.vulns,
    };
  }

  // Query OSV API
  try {
    const requestBody: OsvQueryRequest = {
      package: {
        name: packageName,
        ecosystem: "npm",
      },
    };

    if (version) {
      requestBody.version = version;
    }

    const response = await fetch(`${OSV_API}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "dlx-guard",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      verboseLog("osv", `API error for ${packageName}: HTTP ${response.status}`);
      return { hasVulnerabilities: false, advisories: [] };
    }

    const data = (await response.json()) as OsvQueryResponse;
    const advisories = data.vulns || [];

    // Cache the result (even if empty, to avoid repeated API calls)
    await saveToCache(cachePath, data);

    verboseLog("osv", `Found ${advisories.length} advisories for ${packageName}`);

    return {
      hasVulnerabilities: advisories.length > 0,
      advisories,
    };
  } catch (error) {
    // Network errors shouldn't block execution
    verboseLog("osv", `Request failed for ${packageName}: ${(error as Error).message}`);
    return { hasVulnerabilities: false, advisories: [] };
  }
}

/**
 * Batch check multiple packages
 * Useful for deep dependency scanning
 *
 * @param packages - Array of package names and versions to check
 * @returns Map of package names to their advisories
 */
export async function batchCheckOsv(
  packages: Array<{ name: string; version?: string }>
): Promise<Map<string, OsvAdvisory[]>> {
  const results = new Map<string, OsvAdvisory[]>();

  // Process in parallel batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);
    const promises = batch.map(async (pkg) => {
      const { advisories } = await checkOsvAdvisories(pkg.name, pkg.version);
      if (advisories.length > 0) {
        return [`${pkg.name}@${pkg.version || "latest"}`, advisories] as const;
      }
      return null;
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      if (result) {
        results.set(result[0], result[1]);
      }
    }
  }

  return results;
}

/**
 * Calculate risk score from OSV advisories
 *
 * @param advisories - List of OSV advisories
 * @returns Risk score (0-5) and reason
 */
export function calculateOsvRiskScore(advisories: OsvAdvisory[]): {
  score: number;
  reason: string;
} | null {
  if (advisories.length === 0) {
    return null;
  }

  // Check severity levels
  const severities = advisories.flatMap((a) =>
    a.severity.map((s) => {
      const score = parseFloat(s.score);
      if (!isNaN(score)) return score;
      if (s.type === "CVSS_V3") {
        // Parse CVSS string like "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        const match = s.score.match(/CVSS:3.[01]\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/C:(?:(\d+\.\d+)|H|M|L)/);
        if (match) {
          const cvssScore = match[1];
          if (cvssScore === "H") return 9.0;
          if (cvssScore === "M") return 6.0;
          if (cvssScore === "L") return 3.0;
          return parseFloat(cvssScore || "0");
        }
      }
      return 0;
    })
  );

  const maxSeverity = Math.max(...severities, 0);

  // Score based on severity
  let score = 2; // Base score for any vulnerability

  if (maxSeverity >= 9.0) {
    score = 5; // Critical severity
  } else if (maxSeverity >= 7.0) {
    score = 4; // High severity
  } else if (maxSeverity >= 4.0) {
    score = 3; // Medium severity
  }

  // Add extra score for multiple vulnerabilities
  if (advisories.length >= 3) {
    score += 1;
  }

  const ids = advisories.slice(0, 3).map((a) => a.id).join(", ");

  return {
    score: Math.min(score, 5), // Cap at 5
    reason: `Known vulnerabilities detected (${advisories.length}): ${ids}${advisories.length > 3 ? "..." : ""}`,
  };
}

/**
 * Load from cache
 */
async function loadFromCache<T>(path: string): Promise<T | null> {
  try {
    const file = Bun.file(path);
    if (!file.size) return null;

    const raw = await file.text();
    const cached = JSON.parse(raw) as { data: T; cachedAt: number };

    // Check TTL
    if (Date.now() - cached.cachedAt > ADVISORY_CACHE_TTL) {
      return null; // Cache expired
    }

    return cached.data;
  } catch {
    return null;
  }
}

/**
 * Save to cache
 */
async function saveToCache<T>(path: string, data: T): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    await fs.mkdir(`${CACHE_DIR}/advisories`, { recursive: true });

    const toSave = {
      data,
      cachedAt: Date.now(),
    };

    // Atomic write
    const tmpPath = `${path}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, JSON.stringify(toSave));
    await fs.rename(tmpPath, path);
  } catch {
    // Cache write failures are non-fatal
  }
}

/**
 * Clear advisory cache
 */
export async function clearAdvisoryCache(): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const cacheDir = `${CACHE_DIR}/advisories`;
    await fs.rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}
