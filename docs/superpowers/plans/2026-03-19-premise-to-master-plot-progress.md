# Premise To Master Plot Progress Summary

**Date:** 2026-03-19
**Worktree:** `E:\SweetStarAnimMaker\.worktrees\premise-to-master-plot`
**Branch:** `premise-to-master-plot`
**Related Spec:** `docs/superpowers/specs/2026-03-19-premise-to-master-plot-design.md`
**Related Plan:** `docs/superpowers/plans/2026-03-19-premise-to-master-plot.md`

## Current Status

The `premise -> master_plot` migration is complete for:

- `packages/shared`
- `packages/core`
- `packages/services`

The migration is **not yet complete** for:

- `apps/api`
- `apps/worker`
- `apps/studio`

## Already Completed

### Baseline Fix

- Fixed CORS baseline in `apps/api/src/app.ts`
- API now allows local origins including:
  - `http://127.0.0.1:4273`
  - `http://localhost:5173`

### Shared Contracts

Completed the first-stage contract migration to:

- project statuses:
  - `premise_ready`
  - `master_plot_generating`
  - `master_plot_in_review`
  - `master_plot_approved`
- task type:
  - `master_plot_generate`
- project DTO fields:
  - `premise`
  - `currentMasterPlot`
- review DTO fields:
  - `currentMasterPlot`
  - `latestTask`
  - `availableActions.save`
  - `approveMasterPlotRequestSchema`
  - `rejectMasterPlotRequestSchema`
  - `saveMasterPlotRequestSchema`

### Core Domain And Use Cases

Completed the first-stage core refactor:

- project record now uses premise metadata and current master plot pointer
- task domain now uses `master_plot_generate` and queue `master-plot-generate`
- review record now uses `masterPlotId`
- `createProject` now accepts `premiseText`
- `createStoryboardGenerateTask` now builds premise-based task input
- `processStoryboardGenerateTask` now:
  - reads prompt template
  - renders prompt from `premiseText`
  - persists prompt snapshot
  - calls `masterPlotProvider`
  - persists raw response
  - writes current master plot
  - updates project status to `master_plot_in_review`
  - resets failed runs back to `premise_ready`
- review/save/approve/reject use cases now operate on current master plot

### Services Persistence

Completed the storage and SQLite persistence migration:

- local paths now resolve premise files
- file storage now reads/writes premise files
- `projects` SQLite table now uses:
  - `premise_rel_path`
  - `premise_bytes`
  - `premise_updated_at`
  - `current_master_plot_id`
- review repository now stores `master_plot_id`
- project repository now updates `current_master_plot_id`

## Verification Already Run

These commands passed in the current worktree:

```powershell
corepack pnpm exec vitest run
```

Run in:

- `packages/core`
- `packages/services`

More specifically:

- `packages/core`: 15 files, 32 tests passed
- `packages/services`: 10 files, 28 tests passed

## Current Blockers

### API Layer Still On Old Transport Semantics

`apps/api` is still wired for old first-stage routes and payloads.

Main problem files:

- `apps/api/src/bootstrap/build-spec1-services.ts`
- `apps/api/src/http/register-project-routes.ts`
- `apps/api/src/http/register-task-routes.ts`
- `apps/api/src/http/register-storyboard-routes.ts`

Current issues:

- still injects old `scriptStorage` / storyboard-specific dependencies
- still exposes old route names like `/tasks/storyboard-generate`
- still expects old project payload fields like `script`
- still uses old review route shapes and request schemas

### API Tests Currently Failing

`apps/api` full test run is still red.

Observed failure pattern:

- project create tests return `400` because tests/routes still use old `script` payloads
- many project/task endpoints return `500` because service wiring still points at old use-case dependencies
- storyboard API tests still seed old storyboard-version/project fixtures

## Recommended Next Steps

1. Refactor `apps/api/src/bootstrap/build-spec1-services.ts`
   - wire `premiseStorage` and `masterPlotStorage`
   - remove old first-stage storyboard dependency assumptions
   - change queue name wiring to `master-plot-generate`

2. Refactor project routes
   - `POST /projects` should accept `{ name, premiseText }`
   - remove or repurpose old `/projects/:projectId/script` update route

3. Refactor task routes
   - switch create route to `/projects/:projectId/tasks/master-plot-generate`

4. Refactor review routes
   - switch to:
     - `GET /projects/:projectId/master-plot/review`
     - `PUT /projects/:projectId/master-plot`
     - `POST /projects/:projectId/master-plot/approve`
     - `POST /projects/:projectId/master-plot/reject`

5. Rewrite `apps/api` tests to use:
   - `premiseText`
   - `currentMasterPlot`
   - `master_plot_generate`
   - new route paths

6. After API is green, move to `apps/worker`, then `apps/studio`

## Useful Commands For The Next Session

Run API tests:

```powershell
corepack pnpm exec vitest run
```

In:

```text
apps/api
```

Run worker tests:

```powershell
corepack pnpm exec vitest run
```

In:

```text
apps/worker
```

Run studio tests:

```powershell
corepack pnpm exec vitest run
```

In:

```text
apps/studio
```

## Notes

- The current worktree is dirty by design; do not discard existing changes.
- `apps/api/src/app.ts` already contains the CORS baseline fix.
- Core and services are in a good checkpoint to branch from for API/worker/studio migration.
