/**
 * Structured error handling
 * Following gstack pattern: errors must be actionable for AI agents
 */

/**
 * Custom error types with actionable messages
 */
export class DlxGuardError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = "DlxGuardError";
  }
}

export class PackageNotFoundError extends DlxGuardError {
  constructor(packageName: string) {
    super(
      `Package not found: ${packageName}`,
      1,
      "Check the package name for typos or verify it exists on npm."
    );
    this.name = "PackageNotFoundError";
  }
}

export class RegistryFetchError extends DlxGuardError {
  constructor(packageName: string, originalError: Error) {
    super(
      `Failed to fetch package metadata for ${packageName}: ${originalError.message}`,
      2,
      "Check your internet connection and try again."
    );
    this.name = "RegistryFetchError";
    this.cause = originalError;
  }
}

export class InvalidPackageSpecError extends DlxGuardError {
  constructor(spec: string) {
    super(
      `Invalid package specification: ${spec}`,
      1,
      'Use format: package-name or package-name@version'
    );
    this.name = "InvalidPackageSpecError";
  }
}

/**
 * Global error handler - formats errors for CLI output
 */
export function handleError(error: unknown): void {
  if (error instanceof DlxGuardError) {
    console.error(`Error: ${error.message}`);
    if (error.suggestion) {
      console.error(``);
      console.error(`Suggestion: ${error.suggestion}`);
    }
    return;
  }

  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    // In development, show stack trace
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    return;
  }

  console.error(`Unexpected error: ${String(error)}`);
}
