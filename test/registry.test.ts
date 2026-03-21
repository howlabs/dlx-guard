/**
 * Tests for npm registry client
 */

import { describe, it, expect } from "bun:test";
import { parsePackageSpec } from "../src/lib/registry.ts";

describe("parsePackageSpec", () => {
  it("should parse simple package name", () => {
    const result = parsePackageSpec("lodash");
    expect(result).toEqual({ name: "lodash", version: undefined });
  });

  it("should parse package with version", () => {
    const result = parsePackageSpec("lodash@4.17.21");
    expect(result).toEqual({ name: "lodash", version: "4.17.21" });
  });

  it("should parse scoped package", () => {
    const result = parsePackageSpec("@types/node");
    expect(result).toEqual({ name: "@types/node", version: undefined });
  });

  it("should parse scoped package with version", () => {
    const result = parsePackageSpec("@types/node@20.0.0");
    expect(result).toEqual({ name: "@types/node", version: "20.0.0" });
  });

  it("should handle scoped package with @ in version tag", () => {
    const result = parsePackageSpec("@scope/package@beta");
    expect(result).toEqual({ name: "@scope/package", version: "beta" });
  });
});
