/**
 * Tests cho prompt utilities
 * Chỉ test logic cơ bản, không test interactive terminal behavior
 */

import { describe, it, expect } from "bun:test";
import { restoreStdin } from "../src/lib/prompt.ts";

describe("restoreStdin", () => {
  it("should not throw when called", () => {
    expect(() => restoreStdin()).not.toThrow();
  });

  it("should be idempotent", () => {
    restoreStdin();
    restoreStdin();
    restoreStdin();
    expect(true).toBe(true); // No throw = pass
  });

  it("should handle errors gracefully", () => {
    // Even if stdin is already in normal mode, should not throw
    restoreStdin();
    restoreStdin();
    expect(() => restoreStdin()).not.toThrow();
  });
});

// Note: Interactive prompt tests skipped vì isTTY là readonly trong Bun
// Trong production, promptConfirm hoạt động đúng với terminal TTY
describe("promptConfirm", () => {
  it("should be exported as a function", async () => {
    const { promptConfirm } = await import("../src/lib/prompt.ts");
    expect(typeof promptConfirm).toBe("function");
  });

  it("should return a boolean promise", async () => {
    const { promptConfirm } = await import("../src/lib/prompt.ts");
    const result = await promptConfirm("Test?", false);
    expect(typeof result).toBe("boolean");
  });

  it("should use default value when not in TTY (CI environment)", async () => {
    const { promptConfirm } = await import("../src/lib/prompt.ts");

    // In non-TTY environment (like CI), returns default value immediately
    const result1 = await promptConfirm("Test?", true);
    expect(result1).toBe(true);

    const result2 = await promptConfirm("Test?", false);
    expect(result2).toBe(false);
  });

  it("should handle empty messages", async () => {
    const { promptConfirm } = await import("../src/lib/prompt.ts");
    const result = await promptConfirm("", false);
    expect(typeof result).toBe("boolean");
  });

  it("should handle special characters in message", async () => {
    const { promptConfirm } = await import("../src/lib/prompt.ts");
    const result = await promptConfirm("Continue? ⚠️ \u2713", true);
    expect(typeof result).toBe("boolean");
  });

  it("should handle very long messages", async () => {
    const { promptConfirm } = await import("../src/lib/prompt.ts");
    const longMsg = "Continue? ".repeat(100) + "This is a very long prompt message";
    const result = await promptConfirm(longMsg, false);
    expect(typeof result).toBe("boolean");
  });
});
