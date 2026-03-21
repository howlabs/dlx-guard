# DLX Guard

`dlx-guard` la wrapper va optional shell shim cho `npx`, `pnpm dlx`, `bunx` de canh bao package rui ro truoc khi chay lenh tam thoi.

## Core job

Tra loi tuc thi:

- Goi package nay co dang ngo khong?
- Co install script hay hanh vi publish bat thuong khong?
- Nen tiep tuc, can than, hay dung lai?

## Problem

Dev thuong chay:

```bash
npx some-tool
pnpm dlx some-tool
```

ma khong co thoi gian check ai publish, package moi den muc nao, hay no co script gi. Day la diem ma supply-chain attack tan cong rat tot.

## Target user

- Solo dev
- OSS maintainer
- Startup engineer
- Security-aware dev team nho

## Product shape

- CLI local-first
- Optional shell alias
- Explainable risk score
- Khong bat user vao dashboard ngay tu dau

## Wedge

Lenh dau tien:

```bash
dlx-guard npx create-foo-app
```

Va output phai ro hon scanner thong thuong:

- package age
- maintainer signal
- install scripts
- unusual publish pattern
- reasoned recommendation
