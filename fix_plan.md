# Fix Plan - dlx-guard

Ralph Loop: One item at a time, test after each implementation, commit when green.

## Priority Order (most important first)

### [BLOCKING] Git Initialization
- [ ] Initialize git repository
- [ ] Create initial commit with existing code
- [ ] Tag as v0.1.0

### [TODO] Missing Commands Implementation
- [ ] `pnpm dlx` command - currently stubbed
- [ ] `bunx` command - currently stubbed
- [ ] Both should mirror `npx` command behavior

### [TODO] Interactive Prompt for MEDIUM Risk
- [ ] Add interactive confirmation prompt for MEDIUM risk packages
- [ ] Use `--yes` flag to skip prompt
- [ ] Default to abort if no input

### [TODO] Similar-Name Detection (Typosquatting)
- [ ] Check if package name is similar to popular packages
- [ ] Add +2 score for potential typosquatting
- [ ] Levenshtein distance < 3 for names > 5 chars

### [TODO] Publish Frequency Analysis
- [ ] Detect burst publishing (unusual pattern)
- [ ] Add +2 score for suspicious publish patterns

### [TODO] Enhanced UI/UX
- [ ] Add color-coded risk badges
- [ ] Improve spinner with elapsed time
- [ ] Add verbose mode for debugging

### [TODO] Configuration File Support
- [ ] Support `.dlx-guardrc.json` for user preferences
- [ ] Allow custom risk thresholds
- [ ] Allow package whitelist

### [TODO] Shell Integration
- [ ] Create shell function for easy aliasing
- [ ] Document integration for bash/zsh/fish

### [BACKLOG] Enterprise Features
- [ ] Team audit log
- [ ] Policy engine integration
- [ ] Custom registry support

## Completed
- [x] Project structure and CLI framework
- [x] Risk scoring engine
- [x] Registry client with caching
- [x] `inspect` command
- [x] `npx` command
- [x] Test suite (13 passing)
- [x] Type checking (clean)

## Learnings
- Tests pass, typecheck clean
- Code follows gstack patterns (command registry, structured errors)
- Need to implement actual pnpm/bunx execution (currently stubs)
