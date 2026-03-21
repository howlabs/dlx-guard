/**
 * Tests for risk scoring engine
 */

import { describe, it, expect } from "bun:test";
import { assessRisk } from "../src/lib/risk-scoring.ts";
import type { NpmPackageMetadata } from "../src/types.ts";

function createMetadata(
  overrides: Partial<NpmPackageMetadata> = {}
): NpmPackageMetadata {
  return {
    name: "test-package",
    version: "1.0.0",
    weeks: 52, // 1 year old
    maintainers: [{ name: "trusted-dev" }],
    scripts: {},
    dependencies: {},
    ...overrides,
  };
}

describe("assessRisk", () => {
  it("should return LOW risk for established package", () => {
    const metadata = createMetadata({
      weeks: 52,
      maintainers: [{ name: "dev1" }, { name: "dev2" }],
      scripts: {},
    });

    const result = assessRisk(metadata);

    expect(result.level).toBe("LOW");
    expect(result.score).toBeLessThan(3);
  });

  it("should increase score for recently published package", () => {
    const metadata = createMetadata({
      weeks: 0.01, // < 1 day
    });

    const result = assessRisk(metadata);

    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.reasons.some((r) => r.includes("Published very recently"))).toBe(true);
  });

  it("should increase score for install scripts", () => {
    const metadata = createMetadata({
      scripts: {
        postinstall: "echo 'running postinstall'",
      },
    });

    const result = assessRisk(metadata);

    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.reasons.some((r) => r.includes("install scripts"))).toBe(true);
  });

  it("should increase score for weak maintainer history", () => {
    const metadata = createMetadata({
      maintainers: [{ name: "single-dev" }],
      weeks: 1, // New package
    });

    const result = assessRisk(metadata);

    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.reasons.some((r) => r.includes("maintainer"))).toBe(true);
  });

  it("should increase score for large dependency graph", () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 150; i++) {
      deps[`dep-${i}`] = "^1.0.0";
    }

    const metadata = createMetadata({
      dependencies: deps,
    });

    const result = assessRisk(metadata);

    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.reasons.some((r) => r.includes("dependency"))).toBe(true);
  });

  it("should return CRITICAL for high-risk packages", () => {
    // Create a package with multiple risk factors to reach CRITICAL level (>=10)
    const deps: Record<string, string> = {};
    for (let i = 0; i < 150; i++) {
      deps[`dep-${i}`] = "^1.0.0";
    }

    const metadata = createMetadata({
      weeks: 0.01, // Very new (+3)
      scripts: { postinstall: "node something.js" }, // Install scripts (+3)
      maintainers: [{ name: "newbie" }], // Weak maintainer (+2)
      dependencies: deps, // Large dependency graph (+2)
    });

    const result = assessRisk(metadata);

    expect(result.level).toBe("CRITICAL");
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  it("should provide recommendations for HIGH risk", () => {
    const metadata = createMetadata({
      weeks: 0.01,
      scripts: { postinstall: "node something.js" },
    });

    const result = assessRisk(metadata);

    expect(result.recommendations.length).toBeGreaterThan(0);
    // Score is 6 (3+3) which is HIGH level
    expect(result.level).toBe("HIGH");
  });

  it("should provide DO NOT RUN recommendation for CRITICAL risk", () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 150; i++) {
      deps[`dep-${i}`] = "^1.0.0";
    }

    const metadata = createMetadata({
      weeks: 0.01,
      scripts: { postinstall: "node something.js" },
      maintainers: [{ name: "newbie" }],
      dependencies: deps,
    });

    const result = assessRisk(metadata);

    expect(result.recommendations.some((r) => r.includes("DO NOT RUN"))).toBe(true);
  });
});
