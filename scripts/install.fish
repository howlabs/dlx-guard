#!/usr/bin/env fish
# Fish shell integration for dlx-guard

set -l CONFIG_DIR "$HOME/.config/fish/functions"
set -l FILES_DIR "$HOME/.config/fish"

echo "Installing dlx-guard aliases for fish shell..."

# Create functions directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# npx wrapper
cat > "$CONFIG_DIR/npx.fish" << 'EOF'
function npx
    dlx-guard npx $argv
end
EOF

# pnpm-dlx wrapper
cat > "$CONFIG_DIR/pnpm-dlx.fish" << 'EOF'
function pnpm-dlx
    dlx-guard pnpm dlx $argv
end
EOF

# bunx wrapper
cat > "$CONFIG_DIR/bunx.fish" << 'EOF'
function bunx
    dlx-guard bunx $argv
end
EOF

echo "✓ Created fish functions in $CONFIG_DIR"
echo ""
echo "To use the new aliases, restart your shell or run:"
echo "  source $CONFIG_DIR/npx.fish"
echo "  source $CONFIG_DIR/pnpm-dlx.fish"
echo "  source $CONFIG_DIR/bunx.fish"
echo ""
echo "To bypass dlx-guard, use the full command:"
echo "  command npx ..."
echo "  /usr/bin/npx ..."
