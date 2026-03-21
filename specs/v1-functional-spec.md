# V1 Functional Specification

## Overview
`dlx-guard` is a security wrapper for `npx`, `pnpm dlx`, and `bunx` that warns about risky packages before running.

## Commands

### inspect
```bash
dlx-guard inspect <package>
```
- Analyzes package for security risks
- Outputs risk assessment with reasons and recommendations
- Returns exit code: 0 (LOW), 1 (MEDIUM), 2 (HIGH+)
- Flags: `--json` for JSON output

### npx
```bash
dlx-guard npx <package> [args...]
```
- Pre-flight security check before running npx
- LOW: auto-run
- MEDIUM: warn, require --yes to proceed
- HIGH/CRITICAL: block, require --yes to override
- Flags: `--yes` to auto-confirm, `--json` for JSON output

### pnpm/dlx
```bash
dlx-guard pnpm dlx <package> [args...]
dlx-guard dlx <package> [args...]
```
- Same behavior as npx command
- Uses `pnpm dlx` under the hood

### bunx
```bash
dlx-guard bunx <package> [args...]
```
- Same behavior as npx command
- Uses `bunx` under the hood

## Risk Checks

### 1. Package Age
- +3 score if published < 24 hours ago
- +1 score if published < 7 days ago

### 2. Install Scripts
- +3 score if has preinstall, install, or postinstall scripts

### 3. Maintainer History
- +2 score if < 2 maintainers OR package age < 4 weeks

### 4. Dependency Graph
- +2 score if > 100 dependencies

### 5. Metadata Completeness
- +1 score if missing description, homepage, repository, keywords

## Risk Levels

| Score | Level | Behavior |
|-------|-------|----------|
| 0-2 | LOW | Auto-run |
| 3-5 | MEDIUM | Warn, --yes to proceed |
| 6-9 | HIGH | Block, --yes to override |
| 10+ | CRITICAL | Block, --yes to override |

## Output Format

### Text Output
```
Package: example-package
Risk: MEDIUM (4/10)

Why:
  Published recently (2 days ago)
  Has install scripts that run automatically: postinstall

Recommendation:
  Review the package source before running if possible
  Consider pinning to an exact version
```

### JSON Output
```json
{
  "status": "warning",
  "package": "example-package",
  "risk": {
    "level": "MEDIUM",
    "score": 4,
    "reasons": [...],
    "recommendations": [...]
  }
}
```

## Technical Details

- Written in TypeScript
- Compiled to single binary via Bun
- Caches npm metadata for 15 minutes
- Uses npm registry API
- Atomic cache writes
