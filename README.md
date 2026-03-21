# dlx-guard

> A security wrapper for `npx`, `pnpm dlx`, and `bunx` that warns about risky packages before running.

[![npm version](https://badge.fury.io/js/dlx-guard.svg)](https://www.npmjs.com/package/dlx-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`dlx-guard` answers a critical question before running any package:

> **Is this package safe to execute?**

Developers often run commands like `npx some-tool` without checking who published it, how new the package is, or what scripts it contains. This is a prime attack vector for supply-chain attacks.

`dlx-guard` provides instant, explainable risk assessment before executing any package through `npx`, `pnpm dlx`, or `bunx`.

## Features

- **Pre-flight Security Check** – Analyzes packages before execution
- **Explainable Risk Scoring** – Clear reasons for every risk flag
- **Smart Heuristics** – Detects typosquatting, install scripts, unusual publishing patterns
- **Cross-Manager Support** – Works with npx, pnpm dlx, and bunx
- **Local-First** – No external services or dashboards required
- **Shell Integration** – Optional aliases for seamless workflow
- **Configurable** – Customize risk thresholds and whitelists

## Installation

### Global Install

```bash
npm install -g dlx-guard
# or
pnpm add -g dlx-guard
# or
bun add -g dlx-guard
```

### Build from Source

```bash
git clone https://github.com/yourusername/dlx-guard.git
cd dlx-guard
bun install
bun run build
```

## Usage

### Basic Commands

#### Inspect a Package

```bash
dlx-guard inspect <package>
```

Analyzes a package for security risks and outputs a detailed assessment.

```bash
$ dlx-guard inspect create-react-app

Package: create-react-app
Risk: LOW (2/10)

The package appears safe to run.
```

#### npx Wrapper

```bash
dlx-guard npx <package> [args...]
```

Pre-flight security check before running npx:

```bash
$ dlx-guard npx create-foo-app my-app

Package: create-foo-app
Risk: MEDIUM (4/10)

Why:
  Published recently (2 days ago)
  Has install scripts that run automatically: postinstall

Recommendation:
  Review the package source before running if possible
  Consider pinning to an exact version

Continue? (y/N)
```

#### pnpm dlx Wrapper

```bash
dlx-guard pnpm dlx <package> [args...]
# or
dlx-guard dlx <package> [args...]
```

#### bunx Wrapper

```bash
dlx-guard bunx <package> [args...]
```

### Flags

- `--yes` – Auto-confirm and proceed without prompting
- `--json` – Output results in JSON format
- `--verbose` – Enable verbose logging
- `--no-cache` – Bypass cache and fetch fresh metadata

### Shell Integration

For seamless protection, add shell functions to automatically route through `dlx-guard`:

**Bash / Zsh** – Add to `~/.bashrc` or `~/.zshrc`:

```bash
# npx wrapper
npx() {
  dlx-guard npx "$@"
}

# pnpm dlx wrapper
pnpm-dlx() {
  dlx-guard pnpm dlx "$@"
}

# bunx wrapper
bunx() {
  dlx-guard bunx "$@"
}
```

**Fish Shell** – Create `~/.config/fish/functions/npx.fish`:

```fish
function npx
  dlx-guard npx $argv
end
```

### Bypassing Protection

To bypass the security check (not recommended):

```bash
dlx-guard npx --yes some-package
```

Or use the original command directly:

```bash
command npx some-package
/usr/bin/npx some-package
```

## Risk Levels

| Score | Level | Behavior |
|-------|-------|----------|
| 0-2 | LOW | Auto-run |
| 3-5 | MEDIUM | Warn, requires confirmation |
| 6-9 | HIGH | Block, requires `--yes` to override |
| 10+ | CRITICAL | Block, requires `--yes` to override |

## Risk Checks

`dlx-guard` evaluates multiple heuristics to calculate risk scores:

### 1. Package Age
- **+3 points** – Published < 24 hours ago
- **+1 point** – Published < 7 days ago

### 2. Install Scripts
- **+3 points** – Has preinstall, install, or postinstall scripts

### 3. Maintainer History
- **+2 points** – Fewer than 2 maintainers OR package age < 4 weeks

### 4. Dependency Graph
- **+2 points** – More than 100 dependencies (increases attack surface)

### 5. Metadata Completeness
- **+1 point** – Missing description, homepage, repository, or keywords

### 6. Typosquatting Detection
- **+10 points** – Package name similar to a popular package

### 7. Publish Frequency
- **+2 points** – Abnormal burst publishing pattern detected

### 8. Owner Changes
- **+3 points** – Package ownership has changed

## Configuration

Create a `.dlx-guardrc.json` file in your project root or home directory:

```json
{
  "thresholds": {
    "low": 3,
    "medium": 6,
    "high": 10
  },
  "whitelist": {
    "packages": ["@types/node", "typescript"],
    "patterns": ["@babel/*", "@vue/*"]
  },
  "useCache": true,
  "cacheTtlMinutes": 15,
  "verbose": false
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `thresholds.low` | number | 3 | Score threshold for MEDIUM level |
| `thresholds.medium` | number | 6 | Score threshold for HIGH level |
| `thresholds.high` | number | 10 | Score threshold for CRITICAL level |
| `whitelist.packages` | string[] | [] | Exact package names to skip checks |
| `whitelist.patterns` | string[] | [] | Glob patterns to skip checks |
| `useCache` | boolean | true | Enable metadata caching |
| `cacheTtlMinutes` | number | 15 | Cache duration in minutes |
| `verbose` | boolean | false | Enable verbose logging |

## JSON Output

For integration with CI/CD or automation tools:

```bash
$ dlx-guard inspect --json some-package

{
  "package": "some-package",
  "version": "1.0.0",
  "risk": {
    "level": "MEDIUM",
    "score": 4,
    "reasons": [
      "Published recently (2 days ago)",
      "Has install scripts that run automatically: postinstall"
    ],
    "recommendations": [
      "Review the package source before running if possible",
      "Consider pinning to an exact version"
    ]
  },
  "metadata": {
    "publishedAt": "2024-01-15T10:30:00Z",
    "ageWeeks": 0.3,
    "maintainers": 1,
    "hasInstallScripts": true,
    "dependencyCount": 45
  }
}
```

## Exit Codes

- `0` – LOW risk (safe)
- `1` – MEDIUM risk (warning)
- `2` – HIGH or CRITICAL risk (blocked)

## Development

### Setup

```bash
git clone https://github.com/yourusername/dlx-guard.git
cd dlx-guard
bun install
```

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

### Type Check

```bash
bun run typecheck
```

### Format

```bash
bun run format
```

## What dlx-guard is NOT

- **Not an antivirus** – It doesn't scan for malware signatures
- **Not a policy engine** – It doesn't block installations by corporate policy
- **Not a full SCA tool** – It focuses on execution risk, not dependency auditing
- **Not enterprise governance** – It's designed for individual developers and small teams

## License

MIT © [Your Name]

---

**Protect your supply chain. Think before you execute.**
