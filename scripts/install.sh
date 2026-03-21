#!/bin/bash
# Shell integration installer for dlx-guard
# This script sets up aliases for npx, pnpm dlx, and bunx

set -e

DETECTED_SHELL=""
CONFIG_FILE=""

# Detect the current shell
if [ -n "$ZSH_VERSION" ]; then
    DETECTED_SHELL="zsh"
    CONFIG_FILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    DETECTED_SHELL="bash"
    CONFIG_FILE="$HOME/.bashrc"
else
    echo "Unable to detect shell. Supported: bash, zsh"
    exit 1
fi

echo "Detected shell: $DETECTED_SHELL"
echo "Config file: $CONFIG_FILE"

# Check if dlx-guard is installed
if ! command -v dlx-guard &> /dev/null; then
    echo "Warning: dlx-guard not found in PATH"
    echo "Install it first: bun install -g dlx-guard"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Aliases to add
ALIASES="
# dlx-guard aliases
npx() {
    dlx-guard npx \"\$@\"
}

pnpm-dlx() {
    dlx-guard pnpm dlx \"\$@\"
}

bunx() {
    dlx-guard bunx \"\$@\"
}
"

# Check if aliases already exist
if grep -q "dlx-guard aliases" "$CONFIG_FILE" 2>/dev/null; then
    echo "Aliases already exist in $CONFIG_FILE"
    echo "Remove them first to reinstall"
    exit 0
fi

# Add aliases to config file
echo "" >> "$CONFIG_FILE"
echo "$ALIASES" >> "$CONFIG_FILE"

echo "✓ Added aliases to $CONFIG_FILE"
echo ""
echo "To use the new aliases, restart your shell or run:"
echo "  source $CONFIG_FILE"
echo ""
echo "To bypass dlx-guard, use the full command:"
echo "  command npx ..."
echo "  /usr/bin/npx ..."
