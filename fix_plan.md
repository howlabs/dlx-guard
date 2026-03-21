# Fix Plan - dlx-guard

Ralph Loop: One item at a time, test after each implementation, commit when green.

## Status: MVP COMPLETE v0.3.0

Tất cả core features đã được implement và test.

## Completed Loops

### [DONE] Loop 1 (v0.1.0) - Git Init
- [x] Initialize git repository
- [x] Create initial commit with existing code
- [x] Tag as v0.1.0

### [DONE] Loop 2 (v0.1.0) - Verify Commands
- [x] Verified pnpm-dlx and bunx commands already implemented
- [x] All commands mirror npx behavior

### [DONE] Loop 3 (v0.2.0) - Interactive Prompt
- [x] Add interactive confirmation prompt for MEDIUM risk packages
- [x] Use `--yes` flag to skip prompt
- [x] Default to abort if no input
- [x] Support stdin for piping scenarios

### [DONE] Loop 4 (v0.3.0) - Typosquatting Detection
- [x] Check if package name is similar to popular packages
- [x] Add +3 score for potential typosquatting
- [x] Levenshtein distance <= 2 for names > 5 chars
- [x] Build list of 100+ popular packages to compare against

### [DONE] Loop 5 (v0.3.0) - Binary Build & Verification
- [x] Build binary with bun build
- [x] Test binary with inspect command
- [x] Test binary with real packages (react, @eslint/config-inspector)
- [x] Verify executable works correctly

### [DONE] Loop 6 (v0.3.0) - Shell Integration Docs
- [x] Create shell function examples for bash/zsh
- [x] Document integration for fish shell
- [x] Add usage examples and bypass instructions

## Future Enhancements (BACKLOG)

### [DONE] Enhanced UI/UX
- [x] Improve spinner with elapsed time
- [x] Add verbose mode for debugging
- [x] Color-coded risk badges in output

### [DONE] Configuration File Support
- [x] Support `.dlx-guardrc.json` for user preferences
- [x] Allow custom risk thresholds
- [x] Allow package whitelist

### [TODO] Advanced Security Checks
- [x] Publish Frequency Analysis (burst publishing detection)
- [x] Owner change detection from npm registry
- [ ] Dependency tree analysis

### [TODO] Enterprise Features
- [ ] Team audit log
- [ ] Policy engine integration
- [ ] Custom registry support

## Project Status

**Version:** v0.5.1
**Tests:** 31 passing
**Typecheck:** Clean
**Binary:** Working (Windows tested)

## Recent Changes

### [DONE] Loop 7 (v0.3.1) - Code Cleanup
- [x] Remove unused InvalidPackageSpecError import from npx.ts
- [x] Verify all tests passing
- [x] Build and test binary

### [DONE] Loop 8 (v0.3.2) - Spinner Elapsed Time
- [x] Add elapsed time display to spinner (MM:SS or HH:MM:SS)
- [x] Add formatElapsedTime() helper function
- [x] Add getElapsedTime() method to Spinner class
- [x] Apply dim color styling for time display
- [x] Tests passing, binary built and tested

### [DONE] Loop 9 (v0.3.3) - Verbose Mode
- [x] Add --verbose flag to CLI and types
- [x] Create verbose.ts module with structured logging
- [x] Log configuration (registry, cache dir, TTL)
- [x] Log registry request URLs
- [x] Log cache hit/miss status
- [x] Log timing information (fetch, total execution)
- [x] Log raw metadata dump
- [x] Log risk scoring breakdown with contributions
- [x] Tests passing, binary built and tested

### [DONE] Loop 10 (v0.3.4) - Color-coded Risk Badges
- [x] Add [SAFE] badge in green for LOW risk
- [x] Add [CAUTION] badge in yellow for MEDIUM risk
- [x] Add [WARNING] badge in red for HIGH risk
- [x] Add [DANGER] badge in red for CRITICAL risk
- [x] Badges use colored background with white text
- [x] Tests passing, binary built and tested

**Phase 1: Enhanced UI/UX - COMPLETE!**

### [DONE] Loop 11 (v0.4.0) - Configuration File Support
- [x] Create types/config.ts with DlxGuardConfig schema
- [x] Create lib/config.ts with validation and loading
- [x] Support ~/.dlx-guardrc.json and ./.dlx-guardrc.json
- [x] Custom risk thresholds (low, medium, high)
- [x] Package whitelist with exact names and glob patterns
- [x] Toggle cache on/off via config
- [x] Custom cache TTL in minutes
- [x] Default verbose mode setting
- [x] Integrate with CLI - config loaded at startup
- [x] Risk scoring uses custom thresholds
- [x] Inspect command checks whitelist
- [x] Tests updated to load config
- [x] Tests passing, binary built and tested

**Phase 2: Configuration File Support - COMPLETE!**

### [DONE] Loop 12 (v0.5.0) - Publish Frequency Analysis
- [x] Create lib/publish-frequency.ts module
- [x] Extract and sort all version timestamps
- [x] Count recent versions within 7-day burst window
- [x] Calculate versions per week rate
- [x] Detect >10 versions in 7 days (burst publishing)
- [x] Detect >3 versions per day average (suspicious rate)
- [x] Detect >50 versions in <4 weeks (spam)
- [x] Score contribution: +2 to +4 based on severity
- [x] Integrated into risk scoring engine
- [x] Tests updated to avoid false positives
- [x] Tests passing, binary built and tested

### [DONE] Loop 13 (v0.5.1) - Owner Change Detection
- [x] Create lib/owner-change.ts module
- [x] List of known reputable publishers
- [x] Detect packages with no maintainers
- [x] Detect single unknown maintainer on established packages
- [x] Detect new packages with unknown maintainers
- [x] Pattern matching for suspicious maintainer names
- [x] Score contribution: +1 to +3 based on severity
- [x] Integrated into risk scoring engine
- [x] Tests updated with proper maintainer data
- [x] Tests passing, binary built and tested

## Commands Available

```bash
dlx-guard inspect <package>     # Analyze package security
dlx-guard npx <package>         # Run npx with security check
dlx-guard pnpm dlx <package>    # Run pnpm dlx with security check
dlx-guard bunx <package>        # Run bunx with security check
```

## Risk Checks Implemented

1. ✅ Package age (new packages flagged)
2. ✅ Install scripts detection
3. ✅ Maintainer history analysis
4. ✅ Dependency graph size
5. ✅ Metadata completeness
6. ✅ Typosquatting detection
7. ✅ Burst publishing detection
8. ✅ Owner change detection

## Learnings

- Ralph Loop technique works well for iterative development
- Tests pass (31 passing), typecheck clean
- Typosquatting detection protects against common supply chain attack vector
- Levenshtein algorithm works well for detecting similar package names
- Interactive prompt improves UX significantly
- Binary build with Bun is fast and reliable
