/**
 * Shared type definitions
 * Centralized type definitions following DRY principle
 */

/**
 * Command execution context passed to all command handlers
 */
export interface CommandContext {
  /** Package name to inspect/execute */
  packageName?: string;
  /** Additional arguments to pass through */
  restArgs: string[];
  /** Command flags */
  flags: {
    /** Output JSON instead of formatted text */
    json: boolean;
    /** Auto-confirm prompts */
    yes: boolean;
    /** Show help */
    help: boolean;
    /** Show version */
    version: boolean;
    /** Enable verbose debug output */
    verbose: boolean;
    /** Dry run - check only, don't execute */
    dryRun: boolean;
  };
}

/**
 * Command handler function signature
 * Returns exit code (0 = success, non-zero = error)
 */
export type CommandHandler = (context: CommandContext) => Promise<number>;

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  /** Overall risk level */
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Numeric risk score (higher = more risky) */
  score: number;
  /** Human-readable reasons for the risk score */
  reasons: string[];
  /** Actionable recommendations */
  recommendations: string[];
}

/**
 * npm package metadata (subset of registry response)
 */
export interface NpmPackageMetadata {
  name: string;
  version: string;
  /** ISO timestamp of latest version publish */
  time?: Record<string, string>;
  /** Package maintainers */
  maintainers?: Array<{ name: string; email?: string }>;
  /** Number of weeks package has been published */
  weeks?: number;
  scripts?: {
    preinstall?: string;
    install?: string;
    postinstall?: string;
    preuninstall?: string;
    uninstall?: string;
    postuninstall?: string;
  };
  /** Dependencies declared in package.json */
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Cache entry for package metadata
 */
export interface CacheEntry {
  metadata: NpmPackageMetadata;
  cachedAt: number;
}

/**
 * CLI output format
 */
export interface CliOutput {
  status: "success" | "warning" | "error";
  risk?: RiskAssessment;
  message?: string;
  packageName?: string;
}
