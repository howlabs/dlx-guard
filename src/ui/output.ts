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
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
  bgGreen: "\x1b[42m",
  white: "\x1b[37m",
} as const;

/**
 * Get badge text for risk level
 */
function badgeForLevel(level: string): string {
  switch (level) {
    case "LOW":
      return `${COLORS.bright}${COLORS.bgGreen}${COLORS.white} SAFE ${COLORS.reset}`;
    case "MEDIUM":
      return `${COLORS.bright}${COLORS.bgYellow}${COLORS.white} CAUTION ${COLORS.reset}`;
    case "HIGH":
      return `${COLORS.bright}${COLORS.bgRed}${COLORS.white} WARNING ${COLORS.reset}`;
    case "CRITICAL":
      return `${COLORS.bright}${COLORS.bgRed}${COLORS.white} DANGER ${COLORS.reset}`;
    default:
      return `${COLORS.dim}UNKNOWN${COLORS.reset}`;
  }
}

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
  const badge = badgeForLevel(assessment.level);

  console.log("");
  console.log(`${COLORS.bright}Package:${COLORS.reset} ${packageName}`);
  console.log(`${COLORS.bright}Risk:${COLORS.reset} ${badge} ${levelColor}${assessment.level}${COLORS.reset} (${assessment.score}/10)`);
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
 * Format elapsed time as MM:SS or HH:MM:SS
 */
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Render a spinner (for long-running operations)
 * Shows animated spinner with elapsed time
 */
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;
  private interval?: ReturnType<typeof setInterval>;
  private readonly stream = process.stderr;
  private startTime = 0;
  private message = "";

  start(message: string): void {
    this.message = message;
    this.startTime = Date.now();

    // Hide cursor
    this.stream.write("\x1b[?25l");

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      const elapsed = formatElapsedTime(Date.now() - this.startTime);
      this.stream.write(`\r${frame} ${this.message} ${COLORS.dim}[${elapsed}]${COLORS.reset}`);
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

  /**
   * Get the elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}
