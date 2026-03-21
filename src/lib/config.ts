/**
 * Configuration loader and manager
 * Handles loading, parsing, and merging .dlx-guardrc.json files
 */

import type { DlxGuardConfig, EffectiveConfig } from "../types/config.ts";
import { DEFAULT_CONFIG } from "../types/config.ts";
import { logConfig, verboseLog } from "./verbose.ts";

const CACHE_DIR = `${process.env.HOME ?? process.env.USERPROFILE ?? ""}/.dlx-guard`;

/**
 * Get possible config file paths in priority order
 * 1. .dlx-guardrc.json in current directory
 * 2. .dlx-guardrc.json in home directory
 */
function getConfigPaths(): string[] {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return [
    `${process.cwd()}/.dlx-guardrc.json`,
    `${home}/.dlx-guardrc.json`,
  ];
}

/**
 * Check if a string is a valid package name pattern
 */
function isValidPattern(pattern: string): boolean {
  if (!pattern || typeof pattern !== "string") return false;
  // Allow simple glob patterns with * and ?
  return /^[@a-z0-9/*?-]+$/i.test(pattern);
}

/**
 * Check if a string is a valid package name
 */
function isValidPackageName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  // Scoped or unscoped package name
  return /^(@[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)$/i.test(name);
}

/**
 * Validate configuration object
 * Returns validated config or throws error
 */
function validateConfig(config: unknown): DlxGuardConfig {
  if (typeof config !== "object" || config === null) {
    throw new Error("Config must be an object");
  }

  const cfg = config as Record<string, unknown>;
  const validated: DlxGuardConfig = {};

  // Validate thresholds
  if (cfg.thresholds !== undefined) {
    if (typeof cfg.thresholds !== "object" || cfg.thresholds === null) {
      throw new Error("config.thresholds must be an object");
    }
    const thresholds = cfg.thresholds as Record<string, unknown>;
    validated.thresholds = {};

    if (thresholds.low !== undefined) {
      if (typeof thresholds.low !== "number" || thresholds.low < 0 || thresholds.low > 10) {
        throw new Error("config.thresholds.low must be a number between 0 and 10");
      }
      validated.thresholds.low = thresholds.low;
    }

    if (thresholds.medium !== undefined) {
      if (typeof thresholds.medium !== "number" || thresholds.medium < 0 || thresholds.medium > 10) {
        throw new Error("config.thresholds.medium must be a number between 0 and 10");
      }
      validated.thresholds.medium = thresholds.medium;
    }

    if (thresholds.high !== undefined) {
      if (typeof thresholds.high !== "number" || thresholds.high < 0 || thresholds.high > 10) {
        throw new Error("config.thresholds.high must be a number between 0 and 10");
      }
      validated.thresholds.high = thresholds.high;
    }
  }

  // Validate whitelist
  if (cfg.whitelist !== undefined) {
    if (typeof cfg.whitelist !== "object" || cfg.whitelist === null) {
      throw new Error("config.whitelist must be an object");
    }
    const whitelist = cfg.whitelist as Record<string, unknown>;
    validated.whitelist = {};

    if (whitelist.packages !== undefined) {
      if (!Array.isArray(whitelist.packages)) {
        throw new Error("config.whitelist.packages must be an array");
      }
      const validPackages = (whitelist.packages as unknown[]).filter((item): item is string => typeof item === "string" && isValidPackageName(item));
      if (validPackages.length !== (whitelist.packages as unknown[]).length) {
        throw new Error("config.whitelist.packages contains invalid package names");
      }
      validated.whitelist.packages = validPackages;
    }

    if (whitelist.patterns !== undefined) {
      if (!Array.isArray(whitelist.patterns)) {
        throw new Error("config.whitelist.patterns must be an array");
      }
      const validPatterns = (whitelist.patterns as unknown[]).filter((item): item is string => typeof item === "string" && isValidPattern(item));
      if (validPatterns.length !== (whitelist.patterns as unknown[]).length) {
        throw new Error("config.whitelist.patterns contains invalid patterns");
      }
      validated.whitelist.patterns = validPatterns;
    }
  }

  // Validate boolean options
  if (cfg.useCache !== undefined) {
    if (typeof cfg.useCache !== "boolean") {
      throw new Error("config.useCache must be a boolean");
    }
    validated.useCache = cfg.useCache;
  }

  if (cfg.verbose !== undefined) {
    if (typeof cfg.verbose !== "boolean") {
      throw new Error("config.verbose must be a boolean");
    }
    validated.verbose = cfg.verbose;
  }

  if (cfg.cacheTtlMinutes !== undefined) {
    if (typeof cfg.cacheTtlMinutes !== "number" || cfg.cacheTtlMinutes < 0) {
      throw new Error("config.cacheTtlMinutes must be a positive number");
    }
    validated.cacheTtlMinutes = cfg.cacheTtlMinutes;
  }

  return validated;
}

/**
 * Merge user config with defaults
 */
function mergeConfig(userConfig: DlxGuardConfig): EffectiveConfig {
  return {
    thresholds: {
      low: userConfig.thresholds?.low ?? DEFAULT_CONFIG.thresholds.low,
      medium: userConfig.thresholds?.medium ?? DEFAULT_CONFIG.thresholds.medium,
      high: userConfig.thresholds?.high ?? DEFAULT_CONFIG.thresholds.high,
    },
    whitelistPackages: new Set(userConfig.whitelist?.packages ?? []),
    whitelistPatterns: userConfig.whitelist?.patterns ?? [],
    useCache: userConfig.useCache ?? DEFAULT_CONFIG.useCache,
    cacheTtlMinutes: userConfig.cacheTtlMinutes ?? DEFAULT_CONFIG.cacheTtlMinutes,
    verbose: userConfig.verbose ?? DEFAULT_CONFIG.verbose,
  };
}

/**
 * Load configuration from file
 * Returns the first valid config file found, or null if none exist
 */
async function loadConfigFile(): Promise<DlxGuardConfig | null> {
  const paths = getConfigPaths();

  for (const path of paths) {
    try {
      const file = Bun.file(path);
      if (!file.size) continue;

      const text = await file.text();
      const config = JSON.parse(text);
      const validated = validateConfig(config);

      verboseLog("config", `Loaded config from ${path}`);
      return validated;
    } catch (error) {
      // If file exists but is invalid, warn and continue
      if ((error as { code?: string }).code !== "ENOENT") {
        console.warn(`Warning: Failed to load config from ${path}: ${(error as Error).message}`);
      }
    }
  }

  return null;
}

/**
 * Current active configuration
 */
let activeConfig: EffectiveConfig = { ...DEFAULT_CONFIG };
let configLoaded = false;

/**
 * Load and apply configuration
 * Should be called once at startup
 */
export async function loadConfiguration(): Promise<void> {
  const userConfig = await loadConfigFile();

  if (userConfig) {
    activeConfig = mergeConfig(userConfig);
  } else {
    activeConfig = { ...DEFAULT_CONFIG };
  }

  configLoaded = true;
}

/**
 * Get the current active configuration
 * Throws if configuration hasn't been loaded yet
 */
export function getConfig(): EffectiveConfig {
  if (!configLoaded) {
    throw new Error("Configuration not loaded. Call loadConfiguration() first.");
  }
  return activeConfig;
}

/**
 * Check if a package is whitelisted
 * Checks both exact package names and patterns
 */
export function isPackageWhitelisted(packageName: string): boolean {
  const config = getConfig();

  // Check exact match
  if (config.whitelistPackages.has(packageName)) {
    return true;
  }

  // Check patterns (convert glob patterns to regex)
  for (const pattern of config.whitelistPatterns) {
    const regexPattern = pattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    try {
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(packageName)) {
        return true;
      }
    } catch {
      // Invalid regex, skip
    }
  }

  return false;
}

/**
 * Get custom risk thresholds
 */
export function getThresholds(): Required<{ low: number; medium: number; high: number }> {
  return getConfig().thresholds;
}

/**
 * Get cache TTL in milliseconds
 */
export function getCacheTtl(): number {
  return getConfig().cacheTtlMinutes * 60 * 1000;
}

/**
 * Check if cache is enabled
 */
export function isCacheEnabled(): boolean {
  return getConfig().useCache;
}

/**
 * Check if verbose mode is enabled by default
 */
export function isVerboseByDefault(): boolean {
  return getConfig().verbose;
}

/**
 * Get config file path that was loaded (for display purposes)
 */
export function getConfigSource(): string {
  const paths = getConfigPaths();
  for (const path of paths) {
    try {
      const file = Bun.file(path);
      if (file.size > 0) {
        return path;
      }
    } catch {
      // File doesn't exist or isn't readable
    }
  }
  return "none";
}
