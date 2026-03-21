# Shell Integration

Dùng dlx-guard như wrapper cho npx/pnpm dlx/bunx.

## Bash / Zsh

Thêm vào `~/.bashrc` hoặc `~/.zshrc`:

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

Hoặc dùng alias đơn giản hơn:

```bash
alias npx='dlx-guard npx'
alias pnpm-dlx='dlx-guard pnpm dlx'
alias bunx='dlx-guard bunx'
```

## Fish Shell

Tạo function trong `~/.config/fish/functions/npx.fish`:

```fish
function npx
  dlx-guard npx $argv
end
```

Tạo tương tự cho pnpm-dlx và bunx.

## Usage Examples

Sau khi setup:

```bash
# Thay vì npx create-react-app
npx create-react-app my-app

# Thay vì pnpm dlx create-vite
pnpm-dlx create-vite my-app

# Thay vì bunx some-cli
bunx some-cli --option
```

## Bypass Protection

Để bypass security check (không khuyến khích):

```bash
npx -y some-package
```

Hoặc dùng trực tiếp original command:

```bash
command npx some-package
/usr/bin/npx some-package
```
