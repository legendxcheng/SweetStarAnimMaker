# Workspace Structure Design

## Context

This repository starts from a near-empty baseline and currently only contains the PRD at `docs/prd/Overall.md`.

The first delivery is a browser-first React application that preserves a clean migration path to a future Tauri desktop shell. The workspace should therefore be organized as a `pnpm` monorepo with clear boundaries between app code, domain logic, service adapters, and shared UI/types.

## Decisions

### 1. Workspace Shape

Use a browser-first structure centered on `apps/studio` as the current React application.

```text
SweetStarAnimMaker/
├─ apps/
│  └─ studio/
├─ packages/
│  ├─ core/
│  ├─ services/
│  ├─ shared/
│  └─ ui/
├─ tooling/
├─ docs/
└─ examples/
```

This avoids premature Tauri packaging work while keeping room for a future desktop shell.

### 2. Internal Package Boundaries

`apps/studio` contains only UI-facing concerns:

- `app`: root app wiring and providers
- `pages`: page-level containers
- `features`: business-facing slices such as project, storyboard, review, and export
- `components`, `hooks`, `stores`, `services`, `styles`, `utils`, `types`: shared application concerns

`packages/core` is reserved for pure business logic:

- `domain`
- `pipeline`
- `use-cases`
- `ports`

`packages/services` holds external capability adapters:

- `ai`
- `media`
- `storage`
- `project-repository`

`packages/shared` stores cross-package schemas, constants, and types.

`packages/ui` stores reusable React components and theming.

### 3. Root-Level Conventions

Create only the minimal root files required to establish the workspace:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.gitignore`
- `.editorconfig`
- `README.md`

Avoid creating Tauri-specific directories, database migrations, or release packaging setup in this first step.

## Naming Rules

- Use semantic app names such as `apps/studio`
- Use responsibility-based package names such as `core`, `services`, `shared`, and `ui`
- Use `kebab-case` for feature folders such as `image-generation`
- Export package APIs from package-local `src/index.ts` in later implementation work

## First Scaffolding Scope

The initial scaffolding should create only:

- the approved folder hierarchy
- minimal root workspace files
- placeholder files for otherwise empty directories so the structure is tracked in git

No runtime implementation, package initialization, or Tauri integration is part of this step.
