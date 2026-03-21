# Premise To Master Plot Progress Summary

**Date:** 2026-03-19
**Worktree:** `E:\SweetStarAnimMaker\.worktrees\premise-to-master-plot`
**Branch:** `premise-to-master-plot`
**Related Spec:** `docs/superpowers/specs/2026-03-19-premise-to-master-plot-design.md`
**Related Plan:** `docs/superpowers/plans/2026-03-19-premise-to-master-plot.md`

## Current Status

The `premise -> master_plot` migration is functionally complete across:

- `packages/shared`
- `packages/core`
- `packages/services`
- `apps/api`
- `apps/worker`
- `apps/studio`

The remaining work is final verification and naming/type cleanup:

- workspace `typecheck`
- stale compatibility names that no longer match the first-stage `premise/master_plot` model

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

These commands passed in the current workspace:

```powershell
corepack pnpm exec vitest run
```

Run in:

- `packages/shared`
- `packages/core`
- `packages/services`
- `apps/api`
- `apps/worker`
- `apps/studio`

More specifically:

- `packages/shared`: 4 files, 17 tests passed
- `packages/core`: 15 files, 32 tests passed
- `packages/services`: 11 files, 38 tests passed
- `apps/api`: 11 files, 27 tests passed
- `apps/worker`: 3 files, 5 tests passed
- `apps/studio`: 8 files, 23 tests passed

Additional focused verification run on 2026-03-21:

- `apps/studio/tests/e2e/spec5-studio-flow.test.tsx` now explicitly covers:
  - generating a master plot
  - entering review
  - clicking `通过`
  - navigating back to project detail
  - showing `master_plot_approved` / `已通过`

## Current Blockers

### Final Typecheck And Naming Cleanup

The remaining blockers are no longer transport or API wiring issues. They are final consistency issues surfaced by `typecheck`.

Observed failure pattern:

- schema tests using over-broad `Record<string, ...>` casts instead of concrete exported schemas
- core files still referencing old shared type names such as `StoryboardReviewWorkspace`
- some first-stage list/review helpers still use stale local variable or dependency names from the old storyboard path

## Recommended Next Steps

1. Fix `packages/shared` schema tests so `typecheck` uses concrete schema exports
2. Fix `packages/core` stale type references and list-project master-plot loading
3. Re-run:
   - `corepack pnpm -r test`
   - `corepack pnpm -r typecheck`
4. Run a final naming drift check for old first-stage identifiers in active code
5. Remove or quarantine any remaining compatibility-only old names if they are no longer needed

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
- The Studio approve flow is implemented and regression-covered; it should no longer be tracked as a remaining missing step.
