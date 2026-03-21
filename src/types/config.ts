/**
 * Configuration file types
 * .dlx-guardrc.json schema and validation
 */

/**
 * Risk threshold overrides
 * Allows users to customize when packages are flagged
 */
export interface RiskThresholds {
  /** Score at which risk becomes MEDIUM (default: 3) */
  low?: number;
  /** Score at which risk becomes HIGH (default: 6) */
  medium?: number;
  /** Score at which risk becomes CRITICAL (default: 10) */
  high?: number;
}

/**
 * Package whitelist
 * Packages that are always trusted regardless of risk score
 */
export interface Whitelist {
  /** Package names to trust (supports @scope/package format) */
  packages?: string[];
  /** Package patterns to trust (supports simple globs) */
  patterns?: string[];
}

/**
 * Configuration file schema
 * Located at ~/.dlx-guardrc.json or .dlx-guardrc.json in current directory
 */
export interface DlxGuardConfig {
  /** Custom risk thresholds */
  thresholds?: RiskThresholds;
  /** Trusted packages that bypass warnings */
  whitelist?: Whitelist;
  /** Default: true - set to false to disable cache */
  useCache?: boolean;
  /** Default: 15 - cache TTL in minutes */
  cacheTtlMinutes?: number;
  /** Default: false - enable verbose output by default */
  verbose?: boolean;
}

/**
 * Merged effective configuration
 * Combines defaults with user config
 */
export interface EffectiveConfig {
  thresholds: Required<RiskThresholds>;
  whitelistPackages: Set<string>;
  whitelistPatterns: string[];
  useCache: boolean;
  cacheTtlMinutes: number;
  verbose: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: EffectiveConfig = {
  thresholds: {
    low: 3,
    medium: 6,
    high: 10,
  },
  whitelistPackages: new Set(),
  whitelistPatterns: [],
  useCache: true,
  cacheTtlMinutes: 15,
  verbose: false,
};
