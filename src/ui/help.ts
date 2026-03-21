/**
 * Help text renderer
 * Following gstack pattern: clear, actionable documentation
 */

export function renderHelp(): void {
  console.log(`
dlx-guard - Security wrapper for npx/pnpm dlx/bunx

USAGE:
  dlx-guard <command> [options] <package> [args...]

COMMANDS:
  inspect <package>     Analyze a package for security risks
  npx <package>         Run npx with security check
  pnpm dlx <package>    Run pnpm dlx with security check
  bunx <package>        Run bunx with security check
  clear-cache           Clear package metadata cache

OPTIONS:
  -j, --json            Output JSON instead of formatted text
  -y, --yes             Auto-confirm prompts (skip interactive check)
  -V, --verbose         Enable verbose debug output
      --no-verbose      Disable verbose output (overrides config)
      --dry-run         Check package without executing
  -h, --help            Show this help message
  -v, --version         Show version number

EXAMPLES:
  # Inspect a package before running
  dlx-guard inspect create-foo-app

  # Run with security check
  dlx-guard npx create-foo-app

  # Auto-confirm (non-interactive mode)
  dlx-guard npx -y create-foo-app my-app

  # Get JSON output for scripting
  dlx-guard inspect --json some-package

RISK LEVELS:
  Low        - Package appears safe to run
  Medium     - Some concerns - review before running
  High       - Significant risks - avoid if possible
  Critical   - Dangerous - do not run

For more information, visit: https://github.com/howlabs/dlx-guard
`);
}
