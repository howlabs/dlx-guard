/**
 * Command registry - Single source of truth for available commands
 * Following gstack pattern: all commands defined here, imported elsewhere
 */

import type { CommandContext, CommandHandler } from "./types.ts";
import { inspectCommand } from "./commands/inspect.ts";
import { npxCommand } from "./commands/npx.ts";
import { pnpmDlxCommand } from "./commands/pnpm-dlx.ts";
import { bunxCommand } from "./commands/bunx.ts";

/**
 * Command registry maps command names to their handlers
 * This is the SINGLE SOURCE OF TRUTH for available commands
 */
export const COMMAND_REGISTRY = new Map<string, CommandHandler>([
  ["inspect", inspectCommand],
  ["npx", npxCommand],
  ["pnpm", pnpmDlxCommand],
  ["dlx", pnpmDlxCommand], // Alias for pnpm dlx
  ["bunx", bunxCommand],
]);

/**
 * Get all available command names
 */
export function getAvailableCommands(): string[] {
  return Array.from(COMMAND_REGISTRY.keys());
}

/**
 * Check if a command exists
 */
export function hasCommand(name: string): boolean {
  return COMMAND_REGISTRY.has(name);
}

// Export types for use in command implementations
export type { CommandContext, CommandHandler } from "./types.ts";
