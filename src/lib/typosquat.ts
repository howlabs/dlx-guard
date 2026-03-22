/**
 * Typosquatting detection
 * Following gstack pattern: security-focused, well-tested utility
 *
 * Typosquatting is a technique where attackers create packages with names similar
 * to popular packages but with small typos to trick users into installing them.
 */

import { getPopularPackages as loadPopularPackages } from "./data-loader.ts";

// Cached popular packages for synchronous access (initialized on first load)
let cachedPopularPackages: string[] | null = null;

/**
 * Initialize the cached popular packages list
 * Call this early (e.g., during app startup) for synchronous access later
 */
export async function initializeTyposquatData(): Promise<void> {
  if (!cachedPopularPackages) {
    cachedPopularPackages = await loadPopularPackages();
  }
}

/**
 * Ensure popular packages are loaded (lazy initialization)
 */
async function ensurePopularPackagesLoaded(): Promise<string[]> {
  if (!cachedPopularPackages) {
    cachedPopularPackages = await loadPopularPackages();
  }
  return cachedPopularPackages;
}

/**
 * Calculate Levenshtein distance between two strings
 * Lower numbers indicate more similar strings
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Typosquat check result
 */
export interface TyposquatResult {
  isTyposquat: boolean;
  similarPackage?: string;
  distance?: number;
}

/**
 * Synchronous typosquat check (requires prior initialization)
 * Use this after calling initializeTyposquatData() during app startup
 */
export function checkTyposquatSync(packageName: string): TyposquatResult {
  if (!cachedPopularPackages) {
    // Not initialized, return safe default
    return { isTyposquat: false };
  }

  return checkTyposquatWithList(packageName, cachedPopularPackages);
}

/**
 * Async typosquat check (loads data on demand)
 * Use this if you haven't initialized the data yet
 */
export async function checkTyposquat(packageName: string): Promise<TyposquatResult> {
  const popularPackages = await ensurePopularPackagesLoaded();
  return checkTyposquatWithList(packageName, popularPackages);
}

/**
 * Core typosquat checking logic
 * @internal
 */
function checkTyposquatWithList(
  packageName: string,
  popularPackages: string[]
): TyposquatResult {
  const name = packageName.toLowerCase().replace(/^@[^/]+\//, ""); // Remove scope

  // Skip if package name is too short
  if (name.length < 3) {
    return { isTyposquat: false };
  }

  // Skip if package already exists in popular list
  if (popularPackages.includes(name)) {
    return { isTyposquat: false };
  }

  // Check distance against each popular package
  for (const popular of popularPackages) {
    // Only check if popular package has reasonable length
    if (popular.length < 5) continue;

    const distance = levenshtein(name, popular);

    // Distance <= 2 for packages > 5 chars is suspicious
    // Distance = 1 for shorter packages is also suspicious
    const isClose =
      (popular.length > 5 && distance <= 2) ||
      (popular.length <= 5 && distance === 1);

    if (isClose) {
      return {
        isTyposquat: true,
        similarPackage: popular,
        distance,
      };
    }
  }

  // Check common typosquatting patterns
  const typosquatPatterns = [
    /^([a-z]+)-([a-z]+)\1$/, // Double prefix like "react-react"
    /^([a-z]+)\1$/, // Double name like "reactreact"
  ];

  for (const pattern of typosquatPatterns) {
    if (pattern.test(name)) {
      return {
        isTyposquat: true,
        similarPackage: "suspicious pattern",
        distance: 0,
      };
    }
  }

  return { isTyposquat: false };
}

/**
 * Get list of popular packages (for testing/config)
 * Now async since it loads from data files
 */
export async function getPopularPackages(): Promise<string[]> {
  return loadPopularPackages();
}

/**
 * Get cached popular packages (for synchronous access)
 * Returns null if not yet initialized
 */
export function getCachedPopularPackages(): string[] | null {
  return cachedPopularPackages ? [...cachedPopularPackages] : null;
}
