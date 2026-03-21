# Premise To Master Plot Progress Summary

**Date:** 2026-03-21
**Worktree:** `E:\SweetStarAnimMaker\.worktrees\premise-to-master-plot`
**Branch:** `premise-to-master-plot`
**Related Spec:** `docs/superpowers/specs/2026-03-19-premise-to-master-plot-design.md`
**Related Plan:** `docs/superpowers/plans/2026-03-19-premise-to-master-plot.md`

## Current Status

The first-stage `premise -> master_plot` implementation is now complete for the main delivery path across:

- `packages/shared`
- `packages/core`
- `packages/services`
- `apps/api`
- `apps/worker`
- `apps/studio`

As of 2026-03-21, the end-to-end flow through `Generate Master Plot` has been manually exercised successfully:

- create project with `premiseText`
- create `master_plot_generate` task from Studio/API
- enqueue and process the task in worker flow
- persist the generated current master plot
- return the project to Studio with the generated master plot available for review

This means the core milestone for this migration is no longer blocked on generation-path implementation. The remaining work is follow-up verification and cleanup rather than missing first-stage functionality.

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

Manual smoke verification on 2026-03-21 additionally confirmed:

- the full path up to generated `master_plot` completion works in real usage
- the first-stage generation milestone should now be treated as complete

## Remaining Follow-Up

### Final Verification And Naming Cleanup

There is no known blocker left on the main generation path. The remaining work is to finish consistency checks around the completed implementation:

- rerun workspace `test` / `typecheck` in the current branch state
- clean up any stale compatibility names that still reference old first-stage storyboard terminology
- do one final smoke pass for review actions if a release-ready checkpoint is needed

## Recommended Next Steps

1. Re-run:
   - `corepack pnpm -r test`
   - `corepack pnpm -r typecheck`
2. Run a final naming drift check for old first-stage identifiers in active code
3. Remove or quarantine any remaining compatibility-only old names if they are no longer needed
4. If needed, do one last manual pass over:
   - review save
   - approve
   - reject and regenerate

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
- The first-stage generation path is now manually confirmed complete through generated `master_plot`.
- The Studio approve flow is implemented and regression-covered; it should not be tracked as missing implementation work.
- Remaining work should be treated as release hardening, not core feature delivery.
