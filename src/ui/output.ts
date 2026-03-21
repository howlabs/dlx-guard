/**
 * Terminal output rendering
 * Following gstack pattern: structured, readable output with clear recommendations
 */

import type { RiskAssessment, CliOutput } from "../types.ts";
import { RISK_LEVELS } from "../constants.ts";

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

/**
 * Colorize text based on risk level
 */
function colorForLevel(level: string): string {
  switch (level) {
    case "LOW":
      return COLORS.green;
    case "MEDIUM":
      return COLORS.yellow;
    case "HIGH":
      return COLORS.red;
    case "CRITICAL":
      return COLORS.red;
    default:
      return COLORS.reset;
  }
}

/**
 * Format and render risk assessment to terminal
 */
export function renderRiskAssessment(
  packageName: string,
  assessment: RiskAssessment
): void {
  const levelColor = colorForLevel(assessment.level);

  console.log("");
  console.log(`${COLORS.bright}Package:${COLORS.reset} ${packageName}`);
  console.log(`${COLORS.bright}Risk:${COLORS.reset} ${levelColor}${assessment.level}${COLORS.reset} (${assessment.score}/10)`);
  console.log("");

  if (assessment.reasons.length > 0) {
    console.log(`${COLORS.bright}Why:${COLORS.reset}`);
    for (const reason of assessment.reasons) {
      console.log(`  ${COLORS.dim}•${COLORS.reset} ${reason}`);
    }
    console.log("");
  }

  if (assessment.recommendations.length > 0) {
    console.log(`${COLORS.bright}Recommendation:${COLORS.reset}`);
    for (const rec of assessment.recommendations) {
      console.log(`  ${COLORS.cyan}${rec}${COLORS.reset}`);
    }
    console.log("");
  }
}

/**
 * Render JSON output for scripting
 */
export function renderJsonOutput(output: CliOutput): void {
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Render a warning banner
 */
export function renderWarning(message: string): void {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
}

/**
 * Render an error message
 */
export function renderError(message: string): void {
  console.error(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

/**
 * Render a success message
 */
export function renderSuccess(message: string): void {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

/**
 * Render a spinner (for long-running operations)
 */
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;
  private interval?: ReturnType<typeof setInterval>;
  private readonly stream = process.stderr;

  start(message: string): void {
    // Hide cursor
    this.stream.write("\x1b[?25l");

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      this.stream.write(`\r${frame} ${message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(finalMessage: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    // Clear line and show cursor
    this.stream.write("\r\x1b[K");
    this.stream.write("\x1b[?25h");

    console.log(finalMessage);
  }

  stopAndPersist(finalMessage: string): void {
    this.stop(finalMessage);
  }
}
