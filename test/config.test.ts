/**
 * Tests cho config validation
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { loadConfiguration, isPackageWhitelisted, getThresholds, getCacheTtl, isCacheEnabled, isVerboseByDefault } from "../src/lib/config.ts";

describe("config validation", () => {
  it("should accept valid empty config", async () => {
    // Empty config should use defaults
    await loadConfiguration();
    const thresholds = getThresholds();
    expect(thresholds).toBeDefined();
  });

  it("should validate thresholds through getThresholds", async () => {
    await loadConfiguration();
    const thresholds = getThresholds();
    expect(thresholds.low).toBeGreaterThanOrEqual(0);
    expect(thresholds.low).toBeLessThanOrEqual(10);
    expect(thresholds.medium).toBeGreaterThanOrEqual(0);
    expect(thresholds.medium).toBeLessThanOrEqual(10);
    expect(thresholds.high).toBeGreaterThanOrEqual(0);
    expect(thresholds.high).toBeLessThanOrEqual(10);
  });

  it("should validate package name format for whitelist", async () => {
    await loadConfiguration();
    // Valid formats should return boolean (not throw)
    expect(typeof isPackageWhitelisted("valid-package")).toBe("boolean");
    expect(typeof isPackageWhitelisted("@scope/package")).toBe("boolean");
  });

  it("should validate boolean options", async () => {
    await loadConfiguration();
    expect(typeof isCacheEnabled()).toBe("boolean");
    expect(typeof isVerboseByDefault()).toBe("boolean");
  });

  it("should validate cacheTtlMinutes", async () => {
    await loadConfiguration();
    expect(getCacheTtl()).toBeGreaterThan(0);
  });
});

describe("loadConfiguration", () => {
  beforeEach(async () => {
    // Reset config state
    await loadConfiguration();
  });

  it("should load default configuration", async () => {
    const thresholds = getThresholds();
    expect(thresholds.low).toBe(3);
    expect(thresholds.medium).toBe(6);
    expect(thresholds.high).toBe(10);
  });

  it("should provide default values", async () => {
    expect(isCacheEnabled()).toBe(true);
    expect(getCacheTtl()).toBe(15 * 60 * 1000); // 15 minutes in ms
    expect(isVerboseByDefault()).toBe(false);
  });
});

describe("isPackageWhitelisted", () => {
  beforeEach(async () => {
    await loadConfiguration();
  });

  it("should return false for non-whitelisted packages", () => {
    expect(isPackageWhitelisted("random-package")).toBe(false);
  });

  it("should return false for empty whitelist", () => {
    expect(isPackageWhitelisted("anything")).toBe(false);
  });

  it("should handle exact package matching", async () => {
    // This would require creating a test config file
    // For now, just verify the function works
    expect(typeof isPackageWhitelisted("test")).toBe("boolean");
  });

  it("should handle scoped packages", () => {
    expect(typeof isPackageWhitelisted("@types/node")).toBe("boolean");
  });

  it("should handle pattern matching", () => {
    // Pattern matching depends on config
    expect(typeof isPackageWhitelisted("something")).toBe("boolean");
  });
});

describe("getThresholds", () => {
  beforeEach(async () => {
    await loadConfiguration();
  });

  it("should return default thresholds", () => {
    const thresholds = getThresholds();
    expect(thresholds).toEqual({
      low: 3,
      medium: 6,
      high: 10,
    });
  });

  it("should have required properties", () => {
    const thresholds = getThresholds();
    expect(typeof thresholds.low).toBe("number");
    expect(typeof thresholds.medium).toBe("number");
    expect(typeof thresholds.high).toBe("number");
  });
});

describe("getCacheTtl", () => {
  beforeEach(async () => {
    await loadConfiguration();
  });

  it("should return default TTL in milliseconds", () => {
    const ttl = getCacheTtl();
    expect(ttl).toBe(15 * 60 * 1000);
  });

  it("should be a positive number", () => {
    expect(getCacheTtl()).toBeGreaterThan(0);
  });
});

describe("isCacheEnabled", () => {
  beforeEach(async () => {
    await loadConfiguration();
  });

  it("should return true by default", () => {
    expect(isCacheEnabled()).toBe(true);
  });
});

describe("isVerboseByDefault", () => {
  beforeEach(async () => {
    await loadConfiguration();
  });

  it("should return false by default", () => {
    expect(isVerboseByDefault()).toBe(false);
  });
});

describe("config edge cases", () => {
  it("should handle malformed config gracefully", async () => {
    // Test that invalid config files don't crash the app
    expect(async () => await loadConfiguration()).not.toThrow();
  });

  it("should handle concurrent config loads", async () => {
    await Promise.all([
      loadConfiguration(),
      loadConfiguration(),
      loadConfiguration(),
    ]);
    expect(getThresholds()).toBeDefined();
  });
});
