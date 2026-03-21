/**
 * clear-cache command - Clear package metadata cache
 * Following gstack pattern: simple utility command
 */

import type { CommandHandler } from "../types.ts";
import { CACHE_DIR } from "../constants.ts";
import { renderSuccess, renderError } from "../ui/output.ts";
import { existsSync } from "node:fs";
import { rmSync } from "node:fs";

export const clearCacheCommand: CommandHandler = async (_context) => {
  const cachePath = `${CACHE_DIR}/metadata`;

  try {
    // Check if cache directory exists
    if (!existsSync(cachePath)) {
      renderSuccess("Cache is already empty");
      return 0;
    }

    // Remove cache directory recursively
    rmSync(cachePath, { recursive: true, force: true });

    renderSuccess(`Cleared cache at ${cachePath}`);
    return 0;
  } catch (error) {
    renderError(`Failed to clear cache: ${(error as Error).message}`);
    return 1;
  }
};
