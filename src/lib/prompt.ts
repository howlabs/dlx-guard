/**
 * Interactive prompt utilities
 * Following gstack pattern: clean, testable user interaction
 */

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

  return new Promise<boolean>((resolve) => {
    const onData = (buffer: Buffer) => {
      const input = buffer.toString().trim().toLowerCase();

      // Remove listener after first input
      process.stdin.off("data", onData);
      process.stdin.pause();

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
    process.stdin.setRawMode(true);
  });
}

/**
 * Restore stdin to normal mode
 * Call this after using promptConfirm if you need normal input handling
 */
export function restoreStdin(): void {
  try {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  } catch {
    // Ignore errors if stdin is already in normal mode
  }
}
