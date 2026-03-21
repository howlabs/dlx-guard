# Product Spec

## Positioning

`dlx-guard` khong thay the antivirus hay SCA. No la risk gate dung luc cho dev truoc khi chay package tam thoi.

## V1 commands

```bash
dlx-guard npx <pkg>
dlx-guard pnpm dlx <pkg>
dlx-guard bunx <pkg>
dlx-guard inspect <pkg>
```

## V1 checks

- Package age
- Publish frequency burst
- Owner changes if fetchable
- Install scripts / postinstall
- Binary execution hints
- Dependency count extremes
- Similar-name suspicion
- Low-signal metadata gaps

## Output contract

```text
Risk: Medium
Why:
- Package published 2 hours ago
- Has postinstall script
- Maintainer history is limited
Recommendation:
- Continue only if source is trusted
- Prefer pinning exact version
```

## Non-goals

- Full malware detection
- Blocking every install by policy engine
- Enterprise governance

## Tech

- TypeScript CLI
- npm registry metadata fetch
- package tarball metadata inspection where needed
- tiny local cache

## Moat

- Fast path
- Low-noise heuristics
- Better explanation than raw scoring
- Cross-package-manager entry point
