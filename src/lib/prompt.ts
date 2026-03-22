/**
 * Interactive prompt utilities
 * Following gstack pattern: clean, testable user interaction
 */

import { verboseLog } from "./verbose.ts";

/**
 * Track whether raw mode is currently active
 */
let rawModeActive = false;

/**
 * Flag to prevent duplicate cleanup handlers
 */
let cleanupHandlersRegistered = false;

/**
 * Ensure stdin is returned to normal mode
 * This function is safe to call multiple times
 */
export function ensureCleanStdin(): void {
  if (!rawModeActive) {
    return; // Nothing to clean up
  }

  try {
    // Check if stdin is in raw mode before trying to disable it
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    rawModeActive = false;
  } catch (error) {
    // Ignore cleanup errors - stdin might already be closed or in an invalid state
    verboseLog("prompt", `Stdin cleanup warning: ${(error as Error).message}`);
  }
}

/**
 * Register exit handlers for stdin cleanup
 * Called automatically when raw mode is first entered
 */
function registerCleanupHandlers(): void {
  if (cleanupHandlersRegistered) {
    return;
  }

  cleanupHandlersRegistered = true;

  // Handle normal process exit
  process.on("exit", ensureCleanStdin);

  // Handle termination signals
  process.on("SIGINT", () => {
    ensureCleanStdin();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    ensureCleanStdin();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    ensureCleanStdin();
    throw error; // Re-throw to let default handler run
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    ensureCleanStdin();
    throw reason;
  });
}

/**
 * Prompt user for yes/no confirmation
 * Returns true if user confirms, false otherwise
 *
 * @param message - Prompt message to display
 * @param defaultValue - Default value if no input (true = yes, false = no)
 * @returns Promise<boolean> - User's choice
 */
export async function promptConfirm(
  message: string,
  defaultValue = false
): Promise<boolean> {
  // Check if stdin is a TTY (interactive terminal)
  if (!process.stdin.isTTY) {
    return defaultValue;
  }

  const defaultText = defaultValue ? "Y/n" : "y/N";
  const prompt = `${message} [${defaultText}]: `;

  // Write prompt to stderr to avoid interfering with output piping
  process.stderr.write(prompt);

  // Register cleanup handlers on first use
  if (!cleanupHandlersRegistered) {
    registerCleanupHandlers();
  }

  return new Promise<boolean>((resolve) => {
    const onData = (buffer: Buffer) => {
      const input = buffer.toString().trim().toLowerCase();

      // Remove listener after first input
      process.stdin.off("data", onData);
      process.stdin.pause();

      // Reset raw mode flag
      rawModeActive = false;

      if (input === "" || input === "\n" || input === "\r") {
        // Empty input = use default
        resolve(defaultValue);
      } else if (input === "y" || input === "yes") {
        resolve(true);
      } else if (input === "n" || input === "no") {
        resolve(false);
      } else {
        // Invalid input = treat as no (safe default)
        resolve(false);
      }
    };

    process.stdin.on("data", onData);
    process.stdin.resume();

    // Set stdin to raw mode for character-by-character input
    try {
      process.stdin.setRawMode(true);
      rawModeActive = true;
    } catch (error) {
      // If raw mode fails (e.g., in non-TTY environment), fall back to line mode
      verboseLog("prompt", `Failed to set raw mode: ${(error as Error).message}`);
    }
  });
}

/**
 * Restore stdin to normal mode
 * Call this after using promptConfirm if you need normal input handling
 *
 * @deprecated Use ensureCleanStdin() instead for more reliable cleanup
 */
export function restoreStdin(): void {
  ensureCleanStdin();
}

/**
 * Check if raw mode is currently active
 * Useful for debugging and testing
 */
export function isRawModeActive(): boolean {
  return rawModeActive;
}
