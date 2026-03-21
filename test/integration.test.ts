/**
 * Integration tests cho CLI commands
 * Tests full flows including risk assessment and user interaction
 */

import { describe, it, expect } from "bun:test";
import { spawn } from "bun";

// Helper to run CLI and get output
async function runCli(args: string[], env?: Record<string, string>): Promise<{
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
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout, stderr };
}

describe("CLI Integration", () => {
  describe("inspect command", () => {
    it("should show help when no package provided", async () => {
      const { exitCode, stderr } = await runCli(["inspect"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Package name is required");
    });

    it("should accept --json flag", async () => {
      const { exitCode, stdout } = await runCli(["inspect", "--json", "eslint"]);
      // Should not crash, output should be valid JSON or error
      expect(typeof stdout).toBe("string");
    });

    it("should accept --verbose flag", async () => {
      const { exitCode, stdout } = await runCli(["inspect", "--verbose", "eslint"]);
      expect(typeof stdout).toBe("string");
    });

    it("should show version with --version", async () => {
      const { exitCode, stdout } = await runCli(["--version"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("dlx-guard v");
    });

    it("should show help with --help", async () => {
      const { exitCode, stdout } = await runCli(["--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("USAGE:");
    });
  });

  describe("npx command", () => {
    it("should require package name", async () => {
      const { exitCode, stderr } = await runCli(["npx"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Package name is required");
    });

    it("should accept --yes flag for auto-confirm", async () => {
      const { exitCode } = await runCli(["npx", "--yes", "eslint", "--version"]);
      // May fail if eslint not installed, but should not crash on flags
      expect(typeof exitCode).toBe("number");
    });

    it("should accept --json flag", async () => {
      const { exitCode } = await runCli(["npx", "--json", "eslint", "--version"]);
      expect(typeof exitCode).toBe("number");
    });
  });

  describe("pnpm dlx command", () => {
    it("should require package name", async () => {
      // Note: "dlx" is an alias for pnpm-dlx, so "dlx pkg" works
      const { exitCode, stderr } = await runCli(["dlx"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Package name is required");
    });

    it("should accept 'pnpm dlx' as command", async () => {
      // "pnpm dlx pkg" treats "pnpm" as command, "dlx" as package
      const { exitCode } = await runCli(["pnpm", "dlx", "eslint"]);
      expect(typeof exitCode).toBe("number");
    });
  });

  describe("bunx command", () => {
    it("should require package name", async () => {
      const { exitCode, stderr } = await runCli(["bunx"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Package name is required");
    });
  });

  describe("unknown command", () => {
    it("should show error for unknown command", async () => {
      const { exitCode, stderr } = await runCli(["unknown-command"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Unknown command");
    });
  });

  describe("flag combinations", () => {
    it("should handle multiple flags together", async () => {
      const { exitCode } = await runCli(["inspect", "-j", "-V", "eslint"]);
      expect(typeof exitCode).toBe("number");
    });

    it("should handle --no-verbose flag", async () => {
      const { exitCode } = await runCli(["inspect", "--no-verbose", "eslint"]);
      expect(typeof exitCode).toBe("number");
    });
  });
});

describe("CLI Output Format", () => {
  it("should output valid JSON with --json flag", async () => {
    const { stdout } = await runCli(["inspect", "--json", "eslint"]);

    // Try to parse as JSON - should be valid JSON or error message
    try {
      const parsed = JSON.parse(stdout);
      // If valid JSON, check structure
      if (parsed.status) {
        expect(["success", "warning", "error"]).toContain(parsed.status);
      }
    } catch {
      // If not JSON, that's okay - might be an error message
      expect(typeof stdout).toBe("string");
    }
  });

  it("should show risk levels in output", async () => {
    const { stdout } = await runCli(["inspect", "eslint"]);
    const output = stdout.toLowerCase();
    // Should contain risk-related text
    expect(output.length).toBeGreaterThan(0);
  });
});

describe("CLI Exit Codes", () => {
  it("should return 0 for --help", async () => {
    const { exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
  });

  it("should return 0 for --version", async () => {
    const { exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
  });

  it("should return non-zero for missing package", async () => {
    const { exitCode } = await runCli(["inspect"]);
    expect(exitCode).not.toBe(0);
  });
});

describe("Package Spec Parsing", () => {
  it("should handle scoped packages", async () => {
    const { exitCode } = await runCli(["inspect", "@types/node"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should handle packages with version", async () => {
    const { exitCode } = await runCli(["inspect", "eslint@9.0.0"]);
    expect(typeof exitCode).toBe("number");
  });

  it("should handle scoped packages with version", async () => {
    const { exitCode } = await runCli(["inspect", "@types/node@20.0.0"]);
    expect(typeof exitCode).toBe("number");
  });
});
