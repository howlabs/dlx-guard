/**
 * Tests cho typosquatting detection
 */

import { describe, it, expect } from "bun:test";
import { levenshtein, checkTyposquat, getPopularPackages } from "../src/lib/typosquat.ts";

describe("levenshtein", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshtein("react", "react")).toBe(0);
  });

  it("should return 1 for one character difference", () => {
    expect(levenshtein("react", "reect")).toBe(1);
  });

  it("should return correct distance for different strings", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("should handle empty strings", () => {
    expect(levenshtein("", "test")).toBe(4);
    expect(levenshtein("test", "")).toBe(4);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("checkTyposquat", () => {
  it("should not flag exact popular package names", () => {
    expect(checkTyposquat("react").isTyposquat).toBe(false);
    expect(checkTyposquat("vue").isTyposquat).toBe(false);
    expect(checkTyposquat("express").isTyposquat).toBe(false);
    expect(checkTyposquat("eslint-scope").isTyposquat).toBe(false); // Legitimate package
  });

  it("should detect typosquatting with one character difference", () => {
    const result = checkTyposquat("reect"); // Typo của "react"
    expect(result.isTyposquat).toBe(true);
    expect(result.similarPackage).toBe("react");
  });

  it("should detect typosquatting with two character difference", () => {
    const result = checkTyposquat("reaact"); // Thừa 'a'
    expect(result.isTyposquat).toBe(true);
    expect(result.similarPackage).toBe("react");
  });

  it("should not flag short names with distance > 1", () => {
    const result = checkTyposquat("rea"); // Khá xa "react"
    expect(result.isTyposquat).toBe(false);
  });

  it("should handle scoped packages", () => {
    const result = checkTyposquat("@user/reect");
    expect(result.isTyposquat).toBe(true);
    expect(result.similarPackage).toBe("react");
  });

  it("should be case insensitive", () => {
    const result = checkTyposquat("REACT"); // Exact match
    expect(result.isTyposquat).toBe(false);
  });

  it("should detect typosquatting for other popular packages", () => {
    // Express (length 7, nên distance <= 2 sẽ được check)
    expect(checkTyposquat("exprss").isTyposquat).toBe(true);

    // Lodash (length 6, nên distance <= 2 sẽ được check)
    expect(checkTyposquat("lodas").isTyposquat).toBe(true);

    // Axios (length 5, nên distance <= 2 sẽ được check)
    expect(checkTyposquat("axio").isTyposquat).toBe(true);

    // TypeScript (length 10, nên distance <= 2 sẽ được check)
    expect(checkTyposquat("typescrip").isTyposquat).toBe(true);

    // Note: Vue (length 3) không được check vì quá ngắn
    // skip short package tests vì logic chỉ check packages >= 5 chars
  });

  it("should not flag legitimate different packages", () => {
    expect(checkTyposquat("my-custom-package").isTyposquat).toBe(false);
    expect(checkTyposquat("unique-name-xyz").isTyposquat).toBe(false);
  });

  it("should skip very short package names", () => {
    expect(checkTyposquat("ab").isTyposquat).toBe(false);
    expect(checkTyposquat("xyz").isTyposquat).toBe(false);
  });
});

describe("getPopularPackages", () => {
  it("should return an array of strings", () => {
    const packages = getPopularPackages();
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
    expect(typeof packages[0]).toBe("string");
  });

  it("should contain known popular packages", () => {
    const packages = getPopularPackages();
    expect(packages).toContain("react");
    expect(packages).toContain("vue");
    expect(packages).toContain("express");
    expect(packages).toContain("lodash");
  });
});

describe("typosquat edge cases", () => {
  it("should detect word-suffix+word pattern (word-WORDword)", () => {
    // Pattern: /^([a-z]+)-([a-z]+)\1$/ matches "react-toolsreact"
    const result = checkTyposquat("react-toolsreact");
    expect(result.isTyposquat).toBe(true);
    expect(result.similarPackage).toBe("suspicious pattern");
  });

  it("should detect double name pattern", () => {
    const result = checkTyposquat("reactreact");
    expect(result.isTyposquat).toBe(true);
    expect(result.similarPackage).toBe("suspicious pattern");
  });

  it("should handle unicode characters gracefully", () => {
    const result = checkTyposquat("react\u200b"); // Zero-width space
    // Should not crash, may or may not be typosquat depending on implementation
    expect(typeof result.isTyposquat).toBe("boolean");
  });

  it("should return distance for typosquat packages", () => {
    const result = checkTyposquat("reaact");
    expect(result.distance).toBeDefined();
    expect(result.distance).toBeGreaterThan(0);
  });

  it("should not flag exact popular package with different casing", () => {
    expect(checkTyposquat("React").isTyposquat).toBe(false);
    expect(checkTyposquat("REACT").isTyposquat).toBe(false);
    expect(checkTyposquat("ReAcT").isTyposquat).toBe(false);
  });

  it("should detect typosquat for popular packages with numbers", () => {
    // vitest is 6 chars, so typosquat with distance 1-2 should be detected
    expect(checkTyposquat("vitestt").isTyposquat).toBe(true);
    // Note: jest is only 4 chars (< 5), so it's not checked for typosquatting
    // This is by design to avoid false positives on short names
  });

  it("should not flag legitimate dependencies", () => {
    // These are legitimate packages that should not be flagged
    expect(checkTyposquat("eslint-scope").isTyposquat).toBe(false);
    expect(checkTyposquat("@babel/core").isTyposquat).toBe(false);
  });

  it("should not flag legitimate packages with repeated segments", () => {
    // "react-tools-react" has different segments, not a suspicious repeat pattern
    expect(checkTyposquat("react-tools-react").isTyposquat).toBe(false);
  });
});
