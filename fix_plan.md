# Fix Plan - dlx-guard

Ralph Loop: One item at a time, test after each implementation, commit when green.

## Priority Order (most important first)

### [DONE] Git Initialization
- [x] Initialize git repository
- [x] Create initial commit with existing code
- [x] Tag as v0.1.0

### [DONE] Missing Commands Implementation
- [x] `pnpm dlx` command - fully implemented
- [x] `bunx` command - fully implemented
- [x] Both mirror `npx` command behavior

### [DONE] Interactive Prompt for MEDIUM Risk
- [x] Add interactive confirmation prompt for MEDIUM risk packages
- [x] Use `--yes` flag to skip prompt
- [x] Default to abort if no input
- [x] Support stdin for piping scenarios

### [IN PROGRESS] Similar-Name Detection (Typosquatting)
- [ ] Check if package name is similar to popular packages
- [ ] Add +2 score for potential typosquatting
- [ ] Levenshtein distance < 3 for names > 5 chars
- [ ] Build list of popular packages to compare against

### [TODO] Publish Frequency Analysis
- [ ] Detect burst publishing (unusual pattern)
- [ ] Add +2 score for suspicious publish patterns
- [ ] Check version history from npm registry

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

## Completed Loops
- [x] **Loop 1 (v0.1.0)**: Git init, initial commit, tag
- [x] **Loop 2 (v0.1.0)**: Verified pnpm-dlx and bunx commands already implemented
- [x] **Loop 3 (v0.2.0)**: Interactive prompt for MEDIUM risk packages

## Learnings
- Tests pass (16 passing), typecheck clean
- Interactive prompt improves UX significantly
- isTTY là readonly property trong Bun - tests cần được thiết kế cẩn thận
- Next priority: Typosquatting detection để bảo vệ user khỏi malicious package names
