/**
 * Data loader - Hybrid local/remote data loading
 * Following gstack pattern: robust fallback chain with local defaults
 */

import { CACHE_DIR, VERSION } from "../constants.ts";
import { verboseLog } from "./verbose.ts";

/** Remote data URL (configurable via environment or constants) */
const REMOTE_DATA_BASE_URL = process.env.DLX_GUARD_DATA_URL ||
  "https://dlx-guard.howlabs.io/data/v1";

/** Cache TTL for remote data (24 hours) */
const REMOTE_DATA_TTL = 24 * 60 * 60 * 1000;

/**
 * Remote data response format (may have wrapper or be direct array)
 */
interface RemoteDataResponse<T> {
  packages?: T;
  version?: string;
}

/**
 * Result of a data load operation
 */
export interface DataLoadResult<T> {
  data: T;
  source: "cache" | "local" | "remote" | "fallback";
  lastUpdated: number;
  version?: string;
}

/**
 * Data load options
 */
export interface DataLoadOptions {
  /** Force skip cache */
  skipCache?: boolean;
  /** Fetch from remote even if local exists */
  forceRemote?: boolean;
  /** Timeout for remote fetch (ms) */
  remoteTimeout?: number;
}

/**
 * Embedded default data (used if no local file exists)
 */
const DEFAULT_POPULAR_PACKAGES = [
  "npm", "npx", "yarn", "pnpm", "bun", "bunx", "node", "nvm",
  "react", "vue", "angular", "svelte", "solid-js", "preact", "next", "nuxt", "remix",
  "vite", "webpack", "rollup", "esbuild", "parcel", "turbo", "babel", "typescript",
  "jest", "vitest", "mocha", "cypress", "playwright", "puppeteer",
  "lodash", "axios", "express", "koa", "fastify",
  "chalk", "ora", "eslint", "prettier", "dotenv"
];

const DEFAULT_MALICIOUS_PACKAGES = [
  "crossenv", "event-stream", "ua-parser-js", "flatmap-stream", "eslint-plugin-snapi"
];

/**
 * Generic data manager for loading and caching data
 */
class DataManager<T> {
  private cache: DataLoadResult<T> | null = null;
  private cacheKey: string;

  constructor(cacheKey: string) {
    this.cacheKey = cacheKey;
  }

  /**
   * Load data with hybrid strategy
   */
  async load(
    options: DataLoadOptions = {}
  ): Promise<DataLoadResult<T>> {
    const { skipCache = false, forceRemote = false, remoteTimeout = 5000 } = options;

    // 1. Check cache first (unless skipped)
    if (!skipCache && this.cache && (Date.now() - this.cache.lastUpdated < REMOTE_DATA_TTL)) {
      return this.cache;
    }

    // 2. Try to load from local cache file
    const cachedData = await this.loadFromCache();
    if (cachedData) {
      this.cache = cachedData;

      // 3. Background remote fetch (don't block)
      if (forceRemote || !cachedData || cachedData.source === "fallback") {
        this.fetchRemote(remoteTimeout).then((remoteData) => {
          if (remoteData) {
            this.cache = remoteData;
            this.saveToCache(remoteData);
          }
        }).catch(() => {
          // Silent fail - local data is good enough
        });
      }

      return this.cache;
    }

    // 4. Load from bundled data file (if exists)
    const bundledData = await this.loadFromBundled();
    if (bundledData) {
      this.cache = bundledData;

      // Still try to fetch from remote for next time
      this.fetchRemote(remoteTimeout).then((remoteData) => {
        if (remoteData) {
          this.cache = remoteData;
          this.saveToCache(remoteData);
        }
      }).catch(() => {
        // Silent fail
      });

      return this.cache;
    }

    // 5. Ultimate fallback to embedded defaults
    verboseLog("data", `Using embedded defaults for ${this.cacheKey}`);
    const defaults = this.getDefaults();
    this.cache = {
      data: defaults,
      source: "fallback",
      lastUpdated: Date.now(),
    };

    return this.cache;
  }

  /**
   * Load from cache file in ~/.dlx-guard/data/
   */
  private async loadFromCache(): Promise<DataLoadResult<T> | null> {
    const cachePath = `${CACHE_DIR}/data/${this.cacheKey}.json`;

    try {
      const file = Bun.file(cachePath);
      if (!file.size) return null;

      const raw = await file.text();
      const parsed = JSON.parse(raw);

      // Validate structure
      if (!parsed.data || typeof parsed.data !== "object") {
        verboseLog("data", `Invalid cache structure for ${this.cacheKey}`);
        return null;
      }

      // Check TTL
      const age = Date.now() - (parsed.lastUpdated || 0);
      if (age > REMOTE_DATA_TTL * 7) {
        // Cache is very old (7x TTL), treat as expired
        verboseLog("data", `Cache expired for ${this.cacheKey}`);
        return null;
      }

      return {
        data: parsed.data as T,
        source: "cache",
        lastUpdated: parsed.lastUpdated || Date.now(),
        version: parsed.version,
      };
    } catch {
      return null;
    }
  }

  /**
   * Load from bundled data file in project directory
   */
  private async loadFromBundled(): Promise<DataLoadResult<T> | null> {
    // Try multiple possible paths for the bundled data
    const possiblePaths = [
      `${import.meta.dir}/../../data/${this.cacheKey}.json`,
      `${import.meta.dir}/../data/${this.cacheKey}.json`,
      `./data/${this.cacheKey}.json`,
    ];

    for (const path of possiblePaths) {
      try {
        const file = Bun.file(path);
        if (!file.size) continue;

        const raw = await file.text();
        const parsed = JSON.parse(raw) as RemoteDataResponse<T>;

        // Extract data based on structure (may be wrapped in "packages" or direct)
        const data = parsed.packages ?? (parsed as unknown as T);

        return {
          data,
          source: "local",
          lastUpdated: Date.now(),
          version: parsed.version,
        };
      } catch {
        // Try next path
        continue;
      }
    }

    return null;
  }

  /**
   * Fetch from remote URL
   */
  private async fetchRemote(timeout: number): Promise<DataLoadResult<T> | null> {
    const url = `${REMOTE_DATA_BASE_URL}/${this.cacheKey}.json`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
        headers: {
          "User-Agent": `dlx-guard/${VERSION}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        verboseLog("data", `Remote fetch failed for ${this.cacheKey}: HTTP ${response.status}`);
        return null;
      }

      const parsed = await response.json() as RemoteDataResponse<T>;

      // Extract data based on structure (may be wrapped in "packages" or direct)
      const data = parsed.packages ?? (parsed as unknown as T);

      verboseLog("data", `Fetched ${this.cacheKey} from remote`);

      return {
        data,
        source: "remote",
        lastUpdated: Date.now(),
        version: parsed.version,
      };
    } catch (error) {
      verboseLog("data", `Remote fetch error for ${this.cacheKey}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Save data to cache file
   */
  private async saveToCache(result: DataLoadResult<T>): Promise<void> {
    const cachePath = `${CACHE_DIR}/data/${this.cacheKey}.json`;

    try {
      const fs = await import("node:fs/promises");
      await fs.mkdir(`${CACHE_DIR}/data`, { recursive: true });

      const toSave = {
        data: result.data,
        version: result.version,
        lastUpdated: result.lastUpdated,
      };

      // Atomic write
      const tmpPath = `${cachePath}.tmp.${Date.now()}`;
      await fs.writeFile(tmpPath, JSON.stringify(toSave, null, 2));
      await fs.rename(tmpPath, cachePath);
    } catch (error) {
      verboseLog("data", `Failed to save cache for ${this.cacheKey}: ${(error as Error).message}`);
    }
  }

  /**
   * Get embedded defaults (override in subclasses)
   */
  protected getDefaults(): T {
    return [] as unknown as T;
  }

  /**
   * Force reload data
   */
  async reload(): Promise<DataLoadResult<T>> {
    this.cache = null;
    return this.load({ skipCache: true, forceRemote: true });
  }

  /**
   * Get current cached data without fetching
   */
  getCached(): DataLoadResult<T> | null {
    return this.cache;
  }
}

/**
 * Popular packages data manager
 */
class PopularPackagesManager extends DataManager<string[]> {
  protected getDefaults(): string[] {
    return DEFAULT_POPULAR_PACKAGES;
  }
}

/**
 * Known malicious packages data manager
 */
class MaliciousPackagesManager extends DataManager<MaliciousPackage[]> {
  protected getDefaults(): MaliciousPackage[] {
    return DEFAULT_MALICIOUS_PACKAGES.map((name) => ({
      name,
      reason: "Known malicious package",
    }));
  }
}

/**
 * Malicious package interface
 */
export interface MaliciousPackage {
  name: string;
  reason: string;
  incidentDate?: string;
  affectedVersions?: string[];
}

// Singleton instances
const popularManager = new PopularPackagesManager("popular-packages");
const maliciousManager = new MaliciousPackagesManager("known-malicious");

/**
 * Get popular packages list
 */
export async function getPopularPackages(): Promise<string[]> {
  const result = await popularManager.load();
  return result.data;
}

/**
 * Get known malicious packages list
 */
export async function getKnownMaliciousPackages(): Promise<MaliciousPackage[]> {
  const result = await maliciousManager.load();
  return result.data;
}

/**
 * Force reload all security data from remote
 */
export async function reloadSecurityData(): Promise<void> {
  await popularManager.reload();
  await maliciousManager.reload();
}

/**
 * Get data status for debugging
 */
export async function getDataStatus(): Promise<{
  popularPackages: DataLoadResult<string[]> | null;
  maliciousPackages: DataLoadResult<MaliciousPackage[]> | null;
}> {
  return {
    popularPackages: popularManager.getCached(),
    maliciousPackages: maliciousManager.getCached(),
  };
}
