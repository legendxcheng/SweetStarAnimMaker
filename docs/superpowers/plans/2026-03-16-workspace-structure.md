# Workspace Structure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the approved browser-first monorepo folder structure for SweetStarAnimMaker and add the minimal root workspace files needed to start development.

**Architecture:** The repository will use a `pnpm` workspace with a single current app entry at `apps/studio` and shared packages under `packages/*`. This step only establishes boundaries and tracking placeholders; it does not initialize React, Tauri, or external integrations.

**Tech Stack:** `pnpm` workspaces, TypeScript configuration, Markdown documentation

---

## Chunk 1: Workspace Scaffolding

### Task 1: Persist the approved design and workspace skeleton

**Files:**
- Create: `docs/superpowers/specs/2026-03-16-workspace-structure-design.md`
- Create: `docs/superpowers/plans/2026-03-16-workspace-structure.md`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `README.md`
- Create: `apps/studio/src/**/.gitkeep`
- Create: `apps/studio/public/.gitkeep`
- Create: `apps/studio/tests/**/.gitkeep`
- Create: `packages/**/src/**/.gitkeep`
- Create: `tooling/**/.gitkeep`
- Create: `docs/architecture/.gitkeep`
- Create: `docs/workflows/.gitkeep`
- Create: `examples/.gitkeep`

- [ ] **Step 1: Create the directory tree**

Run a filesystem command that creates the approved directories under `apps/`, `packages/`, `tooling/`, `docs/`, and `examples/`.

- [ ] **Step 2: Add root workspace files**

Create the minimal root files with content that establishes the monorepo boundaries:

```json
{
  "name": "sweet-star-anim-maker",
  "private": true,
  "version": "0.1.0"
}
```

```yaml
packages:
  - apps/*
  - packages/*
  - tooling/*
```

- [ ] **Step 3: Add placeholder files for empty directories**

Create `.gitkeep` files in leaf directories so the structure is visible and trackable in git.

- [ ] **Step 4: Verify the resulting structure**

Run:

```bash
git status --short
rg --files
```

Expected:
- the new root files are present
- the approved directory tree is represented by files in the expected locations
- no unexpected runtime or packaging files have been added

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold initial workspace structure"
```

If the repository should stay uncommitted for now, skip this step only with explicit human direction.
