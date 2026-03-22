# Shell Integration

Use dlx-guard as a wrapper for npx/pnpm dlx/bunx.

## Bash / Zsh

Add to `~/.bashrc` or `~/.zshrc`:

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

Or use a simpler alias:

```bash
alias npx='dlx-guard npx'
alias pnpm-dlx='dlx-guard pnpm dlx'
alias bunx='dlx-guard bunx'
```

## Fish Shell

Create function in `~/.config/fish/functions/npx.fish`:

```fish
function npx
  dlx-guard npx $argv
end
```

Create similar functions for pnpm-dlx and bunx.

## Usage Examples

After setup:

```bash
# Instead of npx create-react-app
npx create-react-app my-app

# Instead of pnpm dlx create-vite
pnpm-dlx create-vite my-app

# Instead of bunx some-cli
bunx some-cli --option
```

## Bypass Protection

To bypass security check (not recommended):

```bash
npx -y some-package
```

Or use the original command directly:

```bash
command npx some-package
/usr/bin/npx some-package
```
