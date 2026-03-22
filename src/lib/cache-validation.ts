/**
 * Cache validation utilities
 * Following gstack pattern: robust validation with clear error messages
 */

import type { CacheEntry, NpmPackageMetadata } from "../types.ts";
import { verboseLog } from "./verbose.ts";

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a package metadata object
 * Checks for required fields and correct types
 */
export function validateNpmPackageMetadata(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Metadata is not an object"] };
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.name !== "string") {
    errors.push("Missing or invalid 'name' field");
  }
  if (typeof obj.version !== "string") {
    errors.push("Missing or invalid 'version' field");
  }

  // Optional but validated if present
  if (obj.time !== undefined && typeof obj.time !== "object") {
    errors.push("'time' field must be an object");
  }

  if (obj.maintainers !== undefined && !Array.isArray(obj.maintainers)) {
    errors.push("'maintainers' field must be an array");
  }

  if (obj.weeks !== undefined && typeof obj.weeks !== "number") {
    errors.push("'weeks' field must be a number");
  }

  // Scripts object validation
  if (obj.scripts !== undefined) {
    if (typeof obj.scripts !== "object") {
      errors.push("'scripts' field must be an object");
    } else {
      const scripts = obj.scripts as Record<string, unknown>;
      const validScriptKeys = ["preinstall", "install", "postinstall", "preuninstall", "uninstall", "postuninstall"];
      for (const key of Object.keys(scripts)) {
        if (!validScriptKeys.includes(key)) {
          errors.push(`Unknown script key: ${key}`);
        }
      }
    }
  }

  // Dependencies validation
  const depFields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const field of depFields) {
    if (obj[field] !== undefined && typeof obj[field] !== "object") {
      errors.push(`'${field}' field must be an object`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a cache entry object
 * Checks for required fields and correct types
 */
export function validateCacheEntry(data: unknown): data is CacheEntry {
  if (!data || typeof data !== "object") {
    verboseLog("cache", "Cache entry is not an object");
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check for required fields
  if (typeof obj.metadata !== "object" || obj.metadata === null) {
    verboseLog("cache", "Cache entry missing metadata field");
    return false;
  }

  if (typeof obj.cachedAt !== "number") {
    verboseLog("cache", "Cache entry missing or invalid cachedAt field");
    return false;
  }

  // Validate the metadata structure
  const metadataResult = validateNpmPackageMetadata(obj.metadata);
  if (!metadataResult.valid) {
    verboseLog("cache", `Invalid metadata structure: ${metadataResult.errors.join(", ")}`);
    return false;
  }

  // Check if cache is too old (negative cachedAt means future timestamp, corrupted)
  if (obj.cachedAt > Date.now() + 60000) {
    verboseLog("cache", "Cache entry has future timestamp (corrupted)");
    return false;
  }

  // Check if cachedAt is unreasonably old (epoch 0 or very old)
  if (obj.cachedAt < 1000000000) {
    verboseLog("cache", "Cache entry has unreasonably old timestamp");
    return false;
  }

  return true;
}

/**
 * Safe JSON parse with validation
 * Returns null if JSON is invalid or doesn't match schema
 */
export function safeParseCacheEntry(json: string): CacheEntry | null {
  try {
    const parsed = JSON.parse(json);
    return validateCacheEntry(parsed) ? parsed : null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      verboseLog("cache", `JSON parse error: ${error.message}`);
    } else {
      verboseLog("cache", `Unexpected error parsing cache: ${error}`);
    }
    return null;
  }
}

/**
 * Get cache entry with full error details
 * Use this for debugging cache issues
 */
export function validateCacheEntryWithDetails(data: unknown): ValidationResult & { data?: CacheEntry } {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Cache entry is not an object"] };
  }

  const obj = data as Record<string, unknown>;

  // Check for required fields
  if (typeof obj.metadata !== "object" || obj.metadata === null) {
    return { valid: false, errors: ["Cache entry missing metadata field"] };
  }

  if (typeof obj.cachedAt !== "number") {
    return { valid: false, errors: ["Cache entry missing or invalid cachedAt field"] };
  }

  // Validate the metadata structure
  const metadataResult = validateNpmPackageMetadata(obj.metadata);
  if (!metadataResult.valid) {
    return metadataResult;
  }

  // All checks passed
  return {
    valid: true,
    errors: [],
    data: data as CacheEntry,
  };
}
