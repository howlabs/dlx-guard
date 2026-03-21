/**
 * Owner change detection
 * Detects suspicious changes in package ownership that may indicate:
 * - Account takeover
 * - Package transfer to unknown entity
 * - Sudden maintainer changes
 */

import type { NpmPackageMetadata } from "../types.ts";

/**
 * Result of owner change analysis
 */
export interface OwnerChangeResult {
  /** Whether suspicious owner change was detected */
  isSuspicious: boolean;
  /** Reason for the suspicion */
  reason?: string;
  /** Current maintainer count */
  currentMaintainerCount: number;
  /** Whether all original maintainers were removed */
  completeTurnover: boolean;
}

/**
 * Known reputable organizations/publishers
 * Packages owned by these entities are considered more trustworthy
 */
const KNOWN_PUBLISHERS = [
  "facebook",
  "meta",
  "google",
  "microsoft",
  "vercel",
  "netlify",
  "cloudflare",
  "amazon",
  "aws",
  "angular",
  "vuejs",
  "react",
  "openjs",
  "nodejs",
  "mozilla",
  "apache",
  "linux",
  "elastic",
  "shopify",
  "stripe",
  "twilio",
  "slack",
  "docker",
];

/**
 * Check if a maintainer name is associated with a known publisher
 */
function isKnownPublisher(maintainerName: string): boolean {
  const lower = maintainerName.toLowerCase();
  return KNOWN_PUBLISHERS.some((publisher) =>
    lower.includes(publisher) || lower.startsWith(publisher + "-")
  );
}

/**
 * Analyze owner change risk based on maintainer patterns
 *
 * Note: npm registry doesn't provide full ownership history in the standard metadata endpoint.
 * This function analyzes current state and flags suspicious patterns:
 * - Single maintainer with unknown identity
 * - Recent package with few/no maintainers
 * - Missing maintainer information entirely
 */
export function analyzeOwnerChange(metadata: NpmPackageMetadata): OwnerChangeResult {
  const maintainers = metadata.maintainers || [];
  const currentMaintainerCount = maintainers.length;

  // No maintainers at all - very suspicious
  if (currentMaintainerCount === 0) {
    return {
      isSuspicious: true,
      reason: "Package has no maintainers listed - abandoned or suspicious",
      currentMaintainerCount: 0,
      completeTurnover: true,
    };
  }

  // Check for single unknown maintainer
  if (currentMaintainerCount === 1) {
    const soleMaintainer = maintainers[0];
    if (!isKnownPublisher(soleMaintainer.name)) {
      // For packages older than 6 months, single unknown maintainer is suspicious
      if ((metadata.weeks ?? 0) > 26) {
        return {
          isSuspicious: true,
          reason: `Single unknown maintainer "${soleMaintainer.name}" on established package - potential takeover`,
          currentMaintainerCount: 1,
          completeTurnover: false,
        };
      }
    }
  }

  // Very new package with no known publisher maintainers
  if ((metadata.weeks ?? 0) < 4 && currentMaintainerCount < 2) {
    const hasKnownPublisher = maintainers.some((m) => isKnownPublisher(m.name));
    if (!hasKnownPublisher) {
      return {
        isSuspicious: true,
        reason: "New package with unknown maintainers - exercise caution",
        currentMaintainerCount,
        completeTurnover: false,
      };
    }
  }

  // Check for suspicious maintainer names (common in spam/takeover)
  const suspiciousPatterns = [
    /^[0-9]+$/, // All numbers
    /^.{1,2}$/, // Very short names
    /(.)\1{4,}/, // Repeated characters (aaaaa)
    /^[a-z]{20,}$/, // Very long lowercase strings
  ];

  for (const maintainer of maintainers) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(maintainer.name)) {
        return {
          isSuspicious: true,
          reason: `Suspicious maintainer name "${maintainer.name}" - possible spam account`,
          currentMaintainerCount,
          completeTurnover: false,
        };
      }
    }
  }

  return {
    isSuspicious: false,
    currentMaintainerCount,
    completeTurnover: false,
  };
}

/**
 * Get risk score contribution from owner change detection
 * Returns score contribution and reason if suspicious, null otherwise
 */
export function getOwnerChangeRisk(metadata: NpmPackageMetadata): { score: number; reason: string } | null {
  const result = analyzeOwnerChange(metadata);

  if (!result.isSuspicious) {
    return null;
  }

  // Score based on severity
  let score = 1; // Base score for suspicious ownership

  if (result.completeTurnover || result.currentMaintainerCount === 0) {
    score = 3; // High severity - no maintainers
  } else if (result.reason?.includes("takeover")) {
    score = 2; // Medium severity - potential takeover
  }

  return {
    score,
    reason: result.reason || "Suspicious ownership pattern detected",
  };
}

/**
 * Check if package is from a known reputable publisher
 */
export function isFromKnownPublisher(metadata: NpmPackageMetadata): boolean {
  const maintainers = metadata.maintainers || [];
  return maintainers.some((m) => isKnownPublisher(m.name));
}
