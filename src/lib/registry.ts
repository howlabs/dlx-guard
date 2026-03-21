/**
 * npm registry client
 * Following gstack pattern: structured error handling, atomic cache writes
 */

import type { NpmPackageMetadata, CacheEntry } from "../types.ts";
import { NPM_REGISTRY, CACHE_DIR, CACHE_TTL } from "../constants.ts";
import { RegistryFetchError, PackageNotFoundError } from "../errors.ts";

/**
 * Parse package name and version from spec
 * Supports: "package", "package@version", "@scope/package", "@scope/package@version"
 */
export function parsePackageSpec(spec: string): { name: string; version?: string } {
  // Match scoped package: @scope/name or @scope/name@version
  const scopedMatch = spec.match(/^(@[^/]+\/[^@]+)(?:@(.+))?$/);
  if (scopedMatch) {
    return { name: scopedMatch[1], version: scopedMatch[2] };
  }

  // Match unscoped package: name or name@version
  const unscopedMatch = spec.match(/^([^@/]+)(?:@(.+))?$/);
  if (unscopedMatch) {
    return { name: unscopedMatch[1], version: unscopedMatch[2] };
  }

  throw new Error(`Invalid package spec: ${spec}`);
}

/**
 * Fetch package metadata from npm registry
 */
export async function fetchPackageMetadata(
  packageName: string
): Promise<NpmPackageMetadata> {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "dlx-guard/0.1.0",
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (response.status === 404) {
    throw new PackageNotFoundError(packageName);
  }

  if (!response.ok) {
    throw new RegistryFetchError(
      packageName,
      new Error(`HTTP ${response.status}: ${response.statusText}`)
    );
  }

  const data = (await response.json()) as NpmRegistryResponse;

  // Transform registry response to our metadata format
  const latestVersion = data["dist-tags"]?.latest;
  if (!latestVersion) {
    throw new RegistryFetchError(packageName, new Error("No latest version found"));
  }

  const versionData = data.versions?.[latestVersion];
  if (!versionData) {
    throw new RegistryFetchError(packageName, new Error("Latest version data not found"));
  }

  // Calculate package age in weeks
  const time = data.time || {};
  const created = time.created || time[latestVersion];
  const weeks = created ? Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;

  return {
    name: data.name,
    version: latestVersion,
    time: time,
    maintainers: data.maintainers || [],
    weeks: weeks,
    scripts: {
      preinstall: versionData.scripts?.preinstall,
      install: versionData.scripts?.install,
      postinstall: versionData.scripts?.postinstall,
      preuninstall: versionData.scripts?.preuninstall,
      uninstall: versionData.scripts?.uninstall,
      postuninstall: versionData.scripts?.postuninstall,
    },
    dependencies: versionData.dependencies,
    devDependencies: versionData.devDependencies,
    peerDependencies: versionData.peerDependencies,
    optionalDependencies: versionData.optionalDependencies,
  };
}

/**
 * Type for npm registry response
 */
interface NpmRegistryResponse {
  name: string;
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, NpmVersionData>;
  time?: Record<string, string>;
  maintainers?: Array<{ name: string; email?: string }>;
}

interface NpmVersionData {
  scripts?: {
    preinstall?: string;
    install?: string;
    postinstall?: string;
    preuninstall?: string;
    uninstall?: string;
    postuninstall?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Get cache file path for a package
 */
function getCachePath(packageName: string): string {
  const safeName = packageName.replace(/[^a-zA-Z0-9@/-]/g, "_");
  return `${CACHE_DIR}/metadata/${safeName}.json`;
}

/**
 * Load cached metadata if valid
 */
export async function loadCachedMetadata(packageName: string): Promise<NpmPackageMetadata | null> {
  try {
    const cachePath = getCachePath(packageName);
    const file = Bun.file(cachePath);

    if (!file.size) {
      return null;
    }

    const cached: CacheEntry = await file.json();
    const age = Date.now() - cached.cachedAt;

    if (age > CACHE_TTL) {
      return null; // Cache expired
    }

    return cached.metadata;
  } catch {
    return null; // Cache miss or invalid
  }
}

/**
 * Save metadata to cache (atomic write)
 */
export async function saveCachedMetadata(
  packageName: string,
  metadata: NpmPackageMetadata
): Promise<void> {
  const cachePath = getCachePath(packageName);

  // Ensure cache directory exists
  const fs = await import("node:fs/promises");
  await fs.mkdir(`${CACHE_DIR}/metadata`, { recursive: true });

  const entry: CacheEntry = {
    metadata,
    cachedAt: Date.now(),
  };

  // Atomic write: temp file + rename
  const tmpPath = `${cachePath}.tmp.${Date.now()}`;
  await fs.writeFile(tmpPath, JSON.stringify(entry));
  await fs.rename(tmpPath, cachePath);
}

/**
 * Get package metadata with caching
 */
export async function getPackageMetadata(
  packageName: string,
  useCache = true
): Promise<NpmPackageMetadata> {
  // Try cache first
  if (useCache) {
    const cached = await loadCachedMetadata(packageName);
    if (cached) {
      return cached;
    }
  }

  // Fetch from registry
  const metadata = await fetchPackageMetadata(packageName);

  // Save to cache
  if (useCache) {
    // Don't wait for cache write
    saveCachedMetadata(packageName, metadata).catch(() => {
      // Cache write failures are non-fatal
    });
  }

  return metadata;
}
