/**
 * Constants used throughout the application
 * Centralized configuration following single-source-of-truth pattern
 */

export const VERSION = "0.3.2";

export const NPM_REGISTRY = "https://registry.npmjs.org";

export const CACHE_DIR = `${process.env.HOME ?? process.env.USERPROFILE ?? ""}/.dlx-guard`;

export const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

/**
 * Risk scoring thresholds
 */
export const RISK_THRESHOLDS = {
  LOW: 3,
  MEDIUM: 6,
  HIGH: 10,
} as const;

/**
 * Risk level labels
 */
export const RISK_LEVELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
} as const;

/**
 * Risk score contributions per MVP spec
 */
export const RISK_SCORES = {
  PACKAGE_PUBLISHED_RECENTLY: 3, // +3 if published in last 24h
  HAS_INSTALL_SCRIPTS: 3, // +3 if has install/postinstall
  WEAK_OWNER_HISTORY: 2, // +2 if package owner history weak
  LARGE_DEPENDENCY_GRAPH: 2, // +2 if dependency graph abnormally large
  SPARSE_METADATA: 1, // +1 if metadata sparse
  TYPOSQUATTING: 3, // +3 if package name giống popular package (typosquatting)
} as const;

/**
 * Dependency count thresholds for detecting abnormal graphs
 */
export const DEPENDENCY_THRESHOLDS = {
  NORMAL: 50,
  HIGH: 100,
  EXCESSIVE: 500,
} as const;
