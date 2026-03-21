# MVP Plan

## MVP scope

Chi support 3 flows:

- `dlx-guard inspect <pkg>`
- `dlx-guard npx <pkg>`
- `dlx-guard pnpm dlx <pkg>`

## Build order

### Step 1

- Parse command line and extract package name
- Fetch npm metadata

### Step 2

- Compute rule-based score
- Detect scripts and package freshness

### Step 3

- Render terminal report
- Add `--json`

### Step 4

- Add continue prompt for interactive shell
- Add `--yes` bypass

### Step 5

- Test on known-safe and known-suspicious examples

## Initial scoring

- +3 if published in last 24h
- +3 if has install/postinstall
- +2 if package owner history weak
- +2 if dependency graph abnormally large
- +1 if metadata sparse

## MVP success metric

- 1000 installs first month
- 30% users run more than once
- 10 examples of users catching a questionable package
