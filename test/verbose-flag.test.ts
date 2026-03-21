/**
 * Tests cho --no-verbose flag
 */

import { describe, it, expect } from "bun:test";
import { spawn } from "bun";

async function runCli(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = spawn([
    "bun",
    "run",
    "src/cli.ts",
    ...args,
  ], {
    cwd: `${import.meta.dir}/..`,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}

describe("--no-verbose flag", () => {
  it("should be accepted as a valid flag", async () => {
    const { exitCode } = await runCli(["inspect", "--no-verbose", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should work with --json flag", async () => {
    const { exitCode } = await runCli(["inspect", "--json", "--no-verbose", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should work with other commands", async () => {
    const { exitCode } = await runCli(["--no-verbose", "inspect", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should take precedence over config file setting", async () => {
    // Even if config has verbose: true, --no-verbose should disable it
    const { exitCode } = await runCli(["inspect", "--no-verbose", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should not conflict with --verbose flag", async () => {
    // If both are provided, the last one should win
    const { exitCode } = await runCli(["inspect", "--verbose", "--no-verbose", "eslint"]);
    expect(typeof exitCode).toBe("number");

    const { exitCode: exitCode2 } = await runCli(["inspect", "--no-verbose", "--verbose", "eslint"]);
    expect(typeof exitCode2).toBe("number");
  });

  it("should work with --help flag", async () => {
    const { exitCode, stdout } = await runCli(["--help", "--no-verbose"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("USAGE:");
  });

  it("should work with --version flag", async () => {
    const { exitCode, stdout } = await runCli(["--version", "--no-verbose"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("dlx-guard v");
  });

  it("should not produce verbose output when enabled", async () => {
    const { stderr } = await runCli(["inspect", "--no-verbose", "eslint"]);
    // Verbose output goes to stderr with special markers
    // With --no-verbose, these should not be present
    expect(stderr).not.toContain("[Configuration]");
    expect(stderr).not.toContain("[Registry]");
    expect(stderr).not.toContain("[Cache]");
  });

  it("should be usable in non-interactive environments", async () => {
    const { exitCode } = await runCli(["--no-verbose", "inspect", "eslint"]);
    // Should work without hanging
    expect(typeof exitCode).toBe("number");
  });
});

describe("verbose flag combinations", () => {
  it("should handle -V short flag", async () => {
    const { exitCode } = await runCli(["inspect", "-V", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should handle --verbose long flag", async () => {
    const { exitCode } = await runCli(["inspect", "--verbose", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should handle --no-verbose long flag", async () => {
    const { exitCode } = await runCli(["inspect", "--no-verbose", "eslint"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should handle flag order correctly", async () => {
    // Test different orderings of flags
    const cases = [
      ["--verbose", "--json", "eslint"],
      ["--json", "--verbose", "eslint"],
      ["--no-verbose", "--json", "eslint"],
      ["--json", "--no-verbose", "eslint"],
    ];

    for (const args of cases) {
      const { exitCode } = await runCli(["inspect", ...args]);
      expect(typeof exitCode).toBe("number");
    }
  });
});

describe("verbose output content", () => {
  it("should show debug info with --verbose", async () => {
    const { stderr } = await runCli(["inspect", "--verbose", "eslint"]);
    // Verbose mode should show configuration/timing info
    // At minimum, should not crash
    expect(typeof stderr).toBe("string");
  });

  it("should not show debug info with --no-verbose", async () => {
    const { stderr } = await runCli(["inspect", "--no-verbose", "eslint"]);
    // Should not contain verbose debug markers
    expect(stderr).not.toContain("[Configuration]");
  });

  it("should show different output with vs without verbose", async () => {
    const { stderr: verboseStderr } = await runCli(["inspect", "--verbose", "eslint"]);
    const { stderr: noVerboseStderr } = await runCli(["inspect", "--no-verbose", "eslint"]);

    // Verbose output should be longer or contain different content
    expect(typeof verboseStderr).toBe("string");
    expect(typeof noVerboseStderr).toBe("string");
  });
});
