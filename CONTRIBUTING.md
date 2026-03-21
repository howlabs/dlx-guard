# Contributing to dlx-guard

Thank you for your interest in contributing to `dlx-guard`! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/yourusername/dlx-guard.git
cd dlx-guard
```

### Install Dependencies

```bash
bun install
```

## Development Workflow

### Running in Development Mode

```bash
bun run dev -- inspect some-package
```

This runs the CLI directly from TypeScript source without building.

### Building

```bash
bun run build
```

This compiles the TypeScript source into a standalone binary at `./dist/dlx-guard`.

### Running Tests

```bash
bun test
```

### Type Checking

```bash
bun run typecheck
```

### Code Formatting

```bash
bun run format
```

This uses Prettier to format all files according to the project's style guide.

## Project Structure

```
dlx-guard/
├── src/
│   ├── cli.ts              # Main entry point
│   ├── commands.ts          # Command router
│   ├── commands/            # Command implementations
│   │   ├── inspect.ts       # inspect command
│   │   ├── npx.ts           # npx wrapper
│   │   ├── pnpm-dlx.ts      # pnpm dlx wrapper
│   │   └── bunx.ts          # bunx wrapper
│   ├── lib/                 # Core libraries
│   │   ├── registry.ts      # npm registry API client
│   │   ├── risk-scoring.ts  # Risk calculation engine
│   │   ├── config.ts        # Configuration loader
│   │   ├── typosquat.ts     # Typosquatting detection
│   │   ├── publish-frequency.ts  # Publish pattern analysis
│   │   ├── owner-change.ts  # Owner change detection
│   │   ├── dependency-tree.ts    # Dependency analysis
│   │   ├── prompt.ts        # User prompts
│   │   └── verbose.ts       # Logging utilities
│   ├── ui/                  # User interface
│   │   ├── output.ts        # Output formatting
│   │   └── help.ts          # Help text
│   ├── types.ts             # Core type definitions
│   ├── types/               # Type definitions
│   │   └── config.ts        # Configuration types
│   ├── constants.ts         # Constants and defaults
│   └── errors.ts            # Error definitions
├── test/                    # Test files
├── docs/                    # Documentation
└── dist/                    # Compiled binary (generated)
```

## Code Style

### TypeScript Conventions

- Use TypeScript for all source files
- Enable strict mode in `tsconfig.json`
- Provide proper type annotations (avoid `any`)
- Use JSDoc comments for exported functions

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `risk-scoring.ts`)
- **Variables/Functions**: `camelCase` (e.g., `calculateRiskScore`)
- **Types/Interfaces**: `PascalCase` (e.g., `RiskAssessment`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `RISK_SCORES`)

### Formatting

The project uses [Prettier](https://prettier.io/) for code formatting. Configuration is in `.prettierrc`:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

## Adding New Risk Checks

To add a new risk check:

1. Create a new function in `src/lib/` (e.g., `src/lib/my-check.ts`)
2. Import and call it from `calculateRiskScore()` in `src/lib/risk-scoring.ts`
3. Add score constants to `src/constants.ts` if needed
4. Write tests in `test/`

Example:

```typescript
// src/lib/my-check.ts
export interface ScoreContribution {
  score: number;
  reason: string;
}

export function getMyCheckRisk(
  metadata: NpmPackageMetadata
): ScoreContribution | null {
  // Your check logic here
  if (someCondition) {
    return {
      score: 2,
      reason: "Detected something risky",
    };
  }
  return null;
}
```

## Testing

### Test Structure

Tests are located in the `test/` directory. Use Bun's built-in test framework.

```typescript
import { describe, it, expect } from "bun:test";
import { calculateRiskScore } from "../src/lib/risk-scoring.ts";

describe("risk scoring", () => {
  it("should score recently published packages higher", () => {
    const metadata = { /* ... */ };
    const result = calculateRiskScore(metadata);
    expect(result.some(c => c.reason.includes("recently"))).toBe(true);
  });
});
```

### Running Specific Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/risk-scoring.test.ts
```

## Submitting Changes

1. Create a new branch for your work:

```bash
git checkout -b feature/my-feature
```

2. Make your changes and commit them:

```bash
git add .
git commit -m "feat: add my new feature"
```

3. Push to your fork:

```bash
git push origin feature/my-feature
```

4. Open a pull request on GitHub

### Commit Message Convention

We follow conventional commits:

- `feat:` – New feature
- `fix:` – Bug fix
- `docs:` – Documentation changes
- `refactor:` – Code refactoring
- `test:` – Adding or updating tests
- `chore:` – Maintenance tasks

## Pull Request Guidelines

- Keep PRs focused on a single issue or feature
- Ensure all tests pass
- Update documentation if needed
- Add tests for new functionality
- Follow the existing code style

## Getting Help

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues and discussions first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
