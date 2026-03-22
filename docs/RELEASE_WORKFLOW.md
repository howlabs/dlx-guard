# Release Workflow

This project uses GitHub Actions to automate releases to both GitHub Releases and npm.

## How to Release

### Option 1: Tag Push (Recommended)

Push a version tag to trigger the workflow:

```bash
# Bump version in package.json
npm version patch  # or minor, major

# Push the tag
git push origin v0.6.1
```

The workflow will:
1. Run tests
2. Build the binary
3. Create a GitHub Release with the binary attached
4. Publish to npm with provenance

### Option 2: Manual Release

1. Go to GitHub → Releases
2. Click "Draft a new release"
3. Enter tag version (e.g., `v0.6.1`)
4. Click "Publish release"

The workflow will automatically publish to npm.

## Setup Requirements

Add the following secrets to your GitHub repository:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `NPM_TOKEN` | npm automation token | Go to npmjs.com → Tokens → Create New Token → Automation |

## Workflow Files

- `.github/workflows/publish.yml` - Main workflow triggered on tag push
- `.github/workflows/release.yml` - Backup workflow for manual GitHub releases

## Pre-release Versions

Tags containing `beta`, `alpha`, or `rc` will be marked as pre-releases:

```bash
git tag v0.7.0-beta.1
git push origin v0.7.0-beta.1
```

## Provenance

All packages published via CI include npm provenance, providing cryptographic proof of origin.
