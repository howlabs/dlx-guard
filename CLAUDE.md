# dlx-guard development

## Overview

`dlx-guard` is a security wrapper for `npx`, `pnpm dlx`, and `bunx` that warns about risky packages before executing them. It follows gstack coding patterns and conventions.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Run CLI in dev mode
bun run build        # Compile binary
bun test             # Run tests
bun run lint         # Lint TypeScript
bun run format       # Format code with Prettier
```

## Project Structure

```
dlx-guard/
├── src/
│   ├── cli.ts              # Main entry point
│   ├── commands.ts         # Command registry (single source of truth)
│   ├── constants.ts        # Configuration constants
│   ├── types.ts            # Type definitions
│   ├── errors.ts           # Error handling
│   ├── commands/           # Command implementations
│   │   ├── inspect.ts
│   │   ├── npx.ts
│   │   ├── pnpm-dlx.ts
│   │   └── bunx.ts
│   ├── lib/                # Core libraries
│   │   ├── registry.ts     # npm registry client
│   │   └── risk-scoring.ts # Risk assessment engine
│   └── ui/                 # UI/rendering
│       ├── help.ts
│       └── output.ts
├── test/                   # Tests
├── dist/                   # Compiled binary
├── package.json
└── tsconfig.json
```

## Coding Patterns

Following gstack conventions:

1. **Command Registry Pattern** - All commands defined in `commands.ts` (single source of truth)
2. **Structured Error Handling** - Errors are actionable with suggestions
3. **Atomic Cache Writes** - Use temp file + rename for cache operations
4. **Type Safety** - Strict TypeScript with shared types in `types.ts`
5. **Constants Centralization** - Magic numbers in `constants.ts`

## Risk Scoring

Per MVP spec:
- +3 if published in last 24h
- +3 if has install/postinstall scripts
- +2 if package owner history weak
- +2 if dependency graph abnormally large
- +1 if metadata sparse

Risk levels:
- 0-2: LOW
- 3-5: MEDIUM
- 6-9: HIGH
- 10+: CRITICAL

## Testing

Run tests before committing:
```bash
bun test
```

## Building

Create compiled binary:
```bash
bun run build
```

Binary output: `dist/dlx-guard`
