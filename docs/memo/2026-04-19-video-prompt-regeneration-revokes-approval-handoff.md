# Hand-off: Revoke Video Approval After Prompt Regeneration

## Scope

This memo is only for review finding #1:

- Regenerating video prompts does not revoke approval for already approved segments.
- Do not broaden this task into config-save invalidation, audio-upload invalidation, or segment-video success-state derivation unless the fix directly depends on them.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Reviewed against commit range `6475220..2ccce95`
- There are already local, uncommitted changes for other findings in:
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/src/use-cases/save-segment-video-config.ts`
  - `packages/core/src/use-cases/update-video-prompt.ts`
  - `packages/core/src/use-cases/upload-segment-video-audio.ts`
  - `packages/core/src/use-cases/derive-project-video-status.ts`
  - `apps/studio/src/components/video-phase-panel.tsx`
  - related tests from those flows

Avoid overwriting those unrelated edits while addressing this finding.

## Problem Summary

The system has two prompt-regeneration entry points for segment videos:

- regenerate one segment prompt via `POST /projects/:projectId/videos/segments/:videoId/regenerate-prompt`
- regenerate all prompts in the current video batch via `POST /projects/:projectId/videos/regenerate-prompts`

Both paths replace `promptTextCurrent` with a newly generated prompt, but neither path revokes approval when the segment was previously approved.

As a result:

- a segment can keep `status === "approved"` after its prompt has materially changed
- `approvedAt` can remain non-null even though the approved output no longer matches the current prompt
- the project can incorrectly remain `videos_approved`
- final-cut generation can stay enabled against stale approved segment videos

This is an approval invalidation bug on prompt regeneration, not a prompt-generation capability bug.

## Why This Happens

### Single-segment regenerate path only rewrites prompt fields

In `packages/core/src/use-cases/regenerate-video-prompt.ts`:

- `updatedSegment` is built at lines 104-109
- it updates `promptTextCurrent`, `promptUpdatedAt`, and `updatedAt`
- it does not change `status`
- it does not clear `approvedAt`
- it does not re-derive project status

Relevant current code:

- `packages/core/src/use-cases/regenerate-video-prompt.ts:104-109`
- `packages/core/src/use-cases/regenerate-video-prompt.ts:111-126`

That means a previously approved segment remains approved after prompt regeneration.

### Batch regenerate path repeats the same bug for every segment

In `packages/core/src/use-cases/regenerate-all-video-prompts.ts`:

- `updatedSegments` are built at lines 111-117
- each segment only gets a new prompt and timestamps
- the loop persists them at lines 120-138
- there is no approval invalidation
- there is no project status update

Relevant current code:

- `packages/core/src/use-cases/regenerate-all-video-prompts.ts:111-117`
- `packages/core/src/use-cases/regenerate-all-video-prompts.ts:120-146`

If a fully approved batch is regenerated, the returned batch summary can still report every segment approved unless the per-segment status is explicitly downgraded.

### Downstream project/final-cut gates still trust approval state

If the regeneration paths leave segments approved:

- project detail can continue to report `videos_approved`
- the video phase can still consider all segments approved
- final-cut generation remains available for outputs that no longer match the current prompts

The bug is therefore not just a stale field problem. It breaks review gating semantics.

## Expected Behavior

When a prompt regeneration path changes a segment that was previously approved:

1. The segment must no longer remain approved.
2. `approvedAt` must be cleared.
3. The segment should move back to `in_review`.
4. The project status should be re-derived from the full batch.
5. If any segment is still `generating`, the project should remain `videos_generating`.
6. If all segments are still approved, the project may remain `videos_approved`.
7. Otherwise the project should become `videos_in_review`.

For this task, the practical target is:

- single-segment prompt regeneration revokes approval when needed
- batch prompt regeneration revokes approval for any approved segment it mutates
- project-level status and approved counts no longer remain stale after regeneration

## Recommended Implementation

Primary backend files:

- `packages/core/src/use-cases/regenerate-video-prompt.ts`
- `packages/core/src/use-cases/regenerate-all-video-prompts.ts`

Recommended backend approach:

1. Detect whether the current segment is `approved`.
2. If so, set:
   - `status: "in_review"`
   - `approvedAt: null`
3. Keep prompt persistence behavior the same.
4. Re-derive project status from the full batch after persistence.

For the single-segment path:

- after `videoRepository.updateSegment(updatedSegment)`, load all batch segments
- call `projectRepository.updateStatus(...)` with derived status

For the batch path:

- downgrade each updated approved segment before persisting
- once all segments are persisted, update project status from the resulting batch state
- ensure the returned `currentBatch` summary reflects downgraded approval counts

### Status derivation

In the current workspace there is already a shared helper:

- `packages/core/src/use-cases/derive-project-video-status.ts`

Use that helper if possible rather than re-implementing the logic again.

Important nuance:

- the helper expects the persisted segment list plus the updated segment overlay
- for batch regeneration, you may need either:
  - a helper call based on the final updated segment array, or
  - a small extension/helper that derives directly from the full post-update array

Do not hard-code `videos_in_review` unless the final state is actually guaranteed.

## Frontend Follow-Up

Primary frontend file:

- `apps/studio/src/components/video-phase-panel.tsx`

The current UI exposes batch prompt regeneration via `handleRegenerateAllPrompts()` at lines 347-363.

Right now it:

- calls `apiClient.regenerateAllVideoPrompts(project.id)`
- applies the returned segment list locally
- does not refresh the parent project summary

If backend status changes correctly but the page does not refresh `project`, the screen can keep stale:

- `approvedSegmentCount`
- project-level `status`
- final-cut enabled state

Recommended frontend change:

1. After successful `regenerateAllVideoPrompts(...)`, call `refreshProject()`.
2. Keep `applyVideoListResponse(response)` so the segment cards update immediately.

There is no visible per-segment regenerate-prompt action in the current video panel, so the frontend work is likely only needed for the batch button unless another UI surface exists elsewhere.

## Important Checks Before Editing

Please verify these points while implementing:

- Whether the single-segment regenerate route is still intentionally supported and should behave consistently with batch regenerate
- Whether batch regeneration should downgrade only segments that were previously approved, or all regenerated segments
- Whether any existing API or UI assumptions depend on regenerated prompts preserving approval

My current reading is:

- only previously approved segments need approval invalidation
- both regenerate paths should be behaviorally consistent
- preserving approval after prompt mutation is the actual bug

## Tests To Add Or Update

### Core use-case tests

Primary files:

- `packages/core/tests/regenerate-video-prompt.test.ts`
- `packages/core/tests/regenerate-all-video-prompts.test.ts`

Add or update assertions that:

- a previously approved segment becomes `in_review`
- `approvedAt` becomes `null`
- project status is re-derived after single-segment regenerate
- batch regenerate returns a summary with correct downgraded approved counts

Recommended concrete cases:

1. Single-segment regenerate on an approved segment in a one-segment batch:
   - segment result becomes `in_review`
   - `projectRepository.updateStatus(...)` receives `videos_in_review`

2. Single-segment regenerate on an approved segment while another segment is still generating:
   - segment result becomes `in_review`
   - project stays `videos_generating`

3. Batch regenerate on a fully approved batch:
   - all regenerated approved segments become `in_review`
   - returned `currentBatch.approvedSegmentCount` is reduced accordingly
   - `projectRepository.updateStatus(...)` is called with `videos_in_review`

### API confidence test

Relevant file:

- `apps/api/tests/video-api.test.ts`

Add narrow route-level coverage that:

- starts from a `videos_approved` project
- hits one of the regenerate prompt routes
- verifies the affected segment is no longer approved
- verifies project detail no longer stays `videos_approved`

Batch regenerate is probably the more important API/UI confidence path because it is currently exposed in the panel.

### UI confidence test

Relevant file:

- `apps/studio/tests/integration/video-phase-panel.test.tsx`

Add a narrow test that:

- starts with a fully approved batch
- clicks `重新生成所有片段提示词`
- verifies `onProjectRefresh` is called
- verifies the panel no longer behaves like all segments are approved after refresh

Keep the UI assertion narrow. The backend is the real fix.

## Acceptance Criteria

The task is done when all of the following are true:

- regenerating a single approved segment prompt clears that segment's approval
- regenerating prompts for an approved batch clears approval for affected segments
- project status no longer remains `videos_approved` after prompt regeneration unless all segments are still genuinely approved
- returned batch summaries no longer over-report approved segments after regeneration
- the current video panel refreshes project summary after batch prompt regeneration
- automated tests cover the new approval-reset behavior

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- regenerate-video-prompt
```

```powershell
corepack pnpm --filter @sweet-star/core test -- regenerate-all-video-prompts
```

If route coverage is added:

```powershell
corepack pnpm --filter @sweet-star/api test -- video-api
```

If UI coverage is added:

```powershell
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

Note: in the current workspace, `@sweet-star/studio` has an unrelated existing failure in `tests/integration/image-phase-panel.test.tsx`, so a broad `video-phase-panel` run may still report red even if this task is correct.

## Relevant Files

- `packages/core/src/use-cases/regenerate-video-prompt.ts`
- `packages/core/src/use-cases/regenerate-all-video-prompts.ts`
- `packages/core/src/use-cases/derive-project-video-status.ts`
- `packages/core/tests/regenerate-video-prompt.test.ts`
- `packages/core/tests/regenerate-all-video-prompts.test.ts`
- `apps/api/tests/video-api.test.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/tests/integration/video-phase-panel.test.tsx`

## Non-Goals

Do not mix this task with:

- config-save approval invalidation
- reference-audio upload approval invalidation
- segment video generation success-state derivation
- broader video-phase UI redesign
- removal of legacy routes unless the fix directly requires it
