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

### [DONE] Similar-Name Detection (Typosquatting)
- [x] Check if package name is similar to popular packages
- [x] Add +3 score for potential typosquatting
- [x] Levenshtein distance <= 2 for names > 5 chars
- [x] Build list of 100+ popular packages to compare against

### [IN PROGRESS] Build & Test Binary
- [ ] Build binary với bun build
- [ ] Test binary với inspect command
- [ ] Test binary với npx command
- [ ] Verify executable works correctly

### [TODO] Shell Integration
- [ ] Create shell function for easy aliasing
- [ ] Document integration cho bash/zsh/fish

### [TODO] Enhanced UI/UX
- [ ] Improve spinner với elapsed time
- [ ] Add verbose mode cho debugging

### [TODO] Configuration File Support
- [ ] Support `.dlx-guardrc.json` cho user preferences
- [ ] Allow custom risk thresholds
- [ ] Allow package whitelist

### [BACKLOG] Future Enhancements
- [ ] Publish Frequency Analysis (burst publishing detection)
- [ ] Enterprise Features (audit log, policy engine, custom registry)

## Completed Loops
- [x] **Loop 1 (v0.1.0)**: Git init, initial commit, tag
- [x] **Loop 2 (v0.1.0)**: Verified pnpm-dlx and bunx commands already implemented
- [x] **Loop 3 (v0.2.0)**: Interactive prompt for MEDIUM risk packages
- [x] **Loop 4 (v0.3.0)**: Typosquatting detection with Levenshtein distance

## Learnings
- Tests pass (31 passing), typecheck clean
- Typosquatting detection protects against common supply chain attack vector
- Levenshtein algorithm works well for detecting similar package names
- Next: Build binary and test end-to-end functionality
