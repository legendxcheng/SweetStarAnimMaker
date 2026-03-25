# Premise Reset Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** `packages/shared`, `packages/core`, `packages/services`, `apps/api`, `apps/studio`

---

## Summary

The current `前提工作区` only displays the project's premise and visual style metadata. The existing backend update flow rewrites premise text only; it does not reset the project back to a clean premise-only state.

This change adds a dedicated destructive reset flow that lets users re-enter both `premiseText` and `visualStyleText`, confirms the action through a second confirmation step, and then force-resets the project back to `premise_ready`.

After reset, the project keeps its identity (`id`, `name`, `slug`, storage root) but removes all downstream generated state, records, task artifacts, and files so the project behaves like a newly created premise-first project.

---

## Design Decisions

### Reset API Strategy

- Add a dedicated endpoint for destructive premise reset instead of overloading the existing premise-update use case.
- Recommended route: `PUT /projects/:projectId/premise/reset`
- Request body should include:
  - `premiseText`
  - `visualStyleText`
  - `confirmReset`
- `confirmReset` must be required and must be `true`; the backend should reject requests that omit confirmation.
- The route returns the refreshed `ProjectDetail` for the reset project.

### Use-Case Boundary

- Implement a new project-level use case for reset orchestration, rather than teaching `updateProjectScript` two unrelated behaviors.
- The use case owns:
  - validating the new premise/style payload
  - loading the current project
  - clearing downstream project pointers and status
  - deleting project-owned downstream records and task artifacts
  - rewriting the project premise file and style metadata
  - returning the refreshed project detail DTO

### Reset Target State

After a successful reset, the project must look like a freshly created premise-first project:

- `status = premise_ready`
- `currentMasterPlotId = null`
- `currentCharacterSheetBatchId = null`
- `currentStoryboardId = null`
- `currentShotScriptId = null`
- `currentImageBatchId = null`
- `currentVideoBatchId = null`
- `premise/v1.md` contains the newly submitted premise text
- `visualStyleText` is updated to the newly submitted value
- `premiseUpdatedAt` and `updatedAt` reflect the reset timestamp

### Data Deletion Scope

The reset is intentionally destructive. It should remove all downstream project data created after the premise stage, including:

- current master-plot files and version artifacts
- character-sheet batches, character records, generated prompts, generated images, and reference images
- storyboard current/version files and related review data
- shot-script current/version files and review data
- image batches, frame records, prompt files, and generated image assets
- video batches, segment records, thumbnails, and generated video assets
- task records for the project
- task input/output/log files for the project

The project root itself should not be deleted. The reset should clean only downstream content, then write the new premise back into the preserved project directory.

### Running Task Handling

- Users are allowed to reset while downstream generation tasks are still running.
- Reset does not wait for active tasks to finish.
- Reset removes the project's persisted task records and task files immediately.
- Any later worker activity for stale tasks must become harmless:
  - if the task record no longer exists, the worker should fail or no-op safely
  - old task results must not restore deleted downstream state into the project

### Confirmation UX

- `前提工作区` becomes an editable panel for `premiseText` and `visualStyleText`.
- The primary action should be explicit about destructiveness, for example `重新输入前提并重置项目`.
- Clicking the action opens a second confirmation dialog.
- The confirmation copy must state that the reset deletes the current master plot, character sheets, storyboard, shot script, images, videos, and task records.
- Canceling the dialog must not issue the API call.

### Failure and Consistency Rules

The highest priority is to avoid a half-reset project that still points at deleted downstream data.

- Reset logic must clear project current pointers and restore `premise_ready` as part of the reset orchestration.
- If cleanup or rewrite steps fail, the project must not keep references to deleted downstream artifacts.
- Full rollback of every deleted file is not required.
- Consistency priority is:
  1. no stale downstream pointers remain on the project
  2. stale tasks cannot repopulate the project
  3. the new premise and style metadata are written successfully

---

## API Contract

### Request

```ts
type ResetProjectPremiseRequest = {
  premiseText: string;
  visualStyleText?: string;
  confirmReset: true;
};
```

### Response

- Reuse the existing `ProjectDetail` response shape.
- After reset, all downstream `current*` fields in the response must be `null`.

### Validation Rules

- `premiseText` is required and must be non-empty after trim.
- `visualStyleText` remains optional but should normalize to a trimmed string.
- `confirmReset` must be `true`.
- Missing project returns `404`.

---

## Implementation Boundaries

- Keep the change scoped to the premise reset flow and the premise-phase UI.
- Reuse existing project detail DTOs and phase navigation behavior.
- Do not redesign other review or generation pages.
- Do not change project identity, slug generation, or create-project behavior.
- Do not introduce soft-reset semantics; the feature is explicitly a hard reset.

---

## Testing Strategy

### Core / Service Tests

- Add use-case coverage proving reset:
  - accepts new premise text and visual style
  - clears all current pointers
  - resets project status to `premise_ready`
  - deletes downstream records and task artifacts
  - allows reset while stale/running tasks exist
  - preserves project identity while replacing premise metadata
- Add repository/service cleanup tests for project-scoped deletion helpers.

### API Tests

- Add route coverage for `PUT /projects/:projectId/premise/reset`.
- Verify success response returns updated premise metadata and null downstream fields.
- Verify invalid payloads fail with `400`.
- Verify missing project returns `404`.

### Studio Tests

- Extend `前提工作区` integration coverage so the panel renders editable fields.
- Verify clicking the destructive action opens the second confirmation dialog.
- Verify cancel does not call the API.
- Verify confirm calls the new reset API with the edited premise/style payload.
- Verify the project detail refresh shows the reset project state afterward.
- Verify request failures keep the edited text in place and show an error.

---

## Files Expected To Change

| File | Change |
|---|---|
| `packages/shared/src/schemas/project-api.ts` | Add reset request schema |
| `apps/api/src/http/register-project-routes.ts` | Add premise reset route |
| `apps/api/tests/projects-api.test.ts` | Add route coverage |
| `packages/core/src/use-cases/update-project-script.ts` or new reset use case file | Replace/update premise-reset behavior boundary |
| `packages/core/tests/update-project-script.test.ts` or new reset use-case test | Add reset orchestration coverage |
| `packages/core/src/ports/*` | Add project-scoped cleanup/delete capabilities where needed |
| `packages/services/src/project-repository/sqlite-project-repository.ts` | Implement project pointer/status reset and downstream deletion helpers |
| `packages/services/src/storage/*` | Add project-scoped downstream file cleanup helpers |
| `apps/studio/src/services/api-client.ts` | Add premise reset API client method |
| `apps/studio/src/components/premise-phase-panel.tsx` | Convert to editable form + confirmation flow |
| `apps/studio/tests/integration/project-detail-page.test.tsx` | Add editable panel and confirmation coverage |

---

## Out of Scope

- No project recreation with a new `id`
- No undo/restore flow after reset
- No background archival of deleted downstream outputs
- No cross-project cleanup behavior
- No redesign of other phase panels beyond whatever is needed to reflect the reset result
