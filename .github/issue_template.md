---
# Issue Title
---

## Issue Summary

Provide a concise overview of the issue (2–3 sentences maximum).

## Type of Issue

- [ ] Bug
- [ ] Feature Request
- [ ] Documentation
- [ ] Performance
- [ ] Security
- [ ] Other (please specify)

## Affected Workspace

This is a monorepo. Please identify which workspace this issue is in so the
right people can triage it quickly:

- [ ] `apps/frontend` — the Next.js app (active, fully implemented)
- [ ] `apps/backend` — Express + TypeScript scaffold (scaffold — see its README roadmap)
- [ ] `contracts/` — Soroban / Rust Cargo workspace (placeholder — not wired in yet)
- [ ] Root / repo-wide (CI, docs, tooling, etc.)
- [ ] Not sure / multiple workspaces

> **Note on `apps/backend` and `contracts/`:** These workspaces are intentional
> scaffolds. `apps/backend` is not called by the frontend yet; `contracts/` is
> a placeholder Cargo workspace. Issues in these workspaces should note
> whether they are forward-looking design work or bugs in the scaffold itself.

## Current Behavior

Describe what is happening now in detail.

## Expected Behavior

Describe what should happen instead.

## Reproduction Steps

1. Start with…
2. Then…
3. Next…
4. Finally…
5. Observe that…

## Environment Details

- Workspace: [e.g., `apps/frontend`]
- Project Version / Commit: [e.g., `v1.2.0` or a short commit SHA]
- Operating System: [e.g., Ubuntu 22.04, macOS 14, Windows 11]
- Node.js Version: [e.g., 20.12.0] _(run `node --version`)_
- Yarn Version: [e.g., 4.9.4] _(run `yarn --version`)_
- Browser / Runtime (if applicable): [e.g., Chrome 124, Firefox 125]
- Additional Tools: [e.g., Docker 25.0, Rust 1.78]

## Supporting Information

### Logs

```plaintext
Paste any relevant logs, error messages, or console output here.
```

### Screenshots / Videos

<!-- Optional: attach screenshots or a Loom link if they help explain the issue. -->

---

### Before you submit

- [ ] I searched [open issues](https://github.com/frienzy514-png/stellar-TrueStub/issues) and this is not a duplicate.
- [ ] I identified the affected workspace above.
- [ ] I included reproduction steps and environment details.
- [ ] I read the [Contributing Guide](../CONTRIBUTING.md) and [Git Guidelines](../docs/GIT_GUIDELINE.md).
