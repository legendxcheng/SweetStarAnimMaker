# Hand-off: Fix Segment Video Prompt Generation Status Finalization

## Scope

This memo is only for review finding #1:

- After Seedance segment video prompt/config generation succeeds, the project can remain stuck in `videos_generating`.
- Do not broaden this task into the other review findings unless the fix directly depends on them.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Reviewed against commit range `6475220..2ccce95`

## Problem Summary

The async task that generates the initial segment video prompt/config updates the segment prompt fields, but it does not finalize the segment/project status on success.

As a result:

- backend data may keep `project.status === "videos_generating"`
- frontend keeps polling the batch as if generation is still in progress
- the user may not reliably transition into the editable review workflow for segment configs

This is a status finalization bug, not a prompt generation capability bug.

## Why This Happens

### Backend success path is incomplete

In `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`:

- success path updates `promptTextSeed`, `promptTextCurrent`, `promptUpdatedAt`, `updatedAt`
- but it does not update `currentSegment.status`
- and it does not call `projectRepository.updateStatus(...)`

Relevant lines at current `HEAD`:

- `updatedSegment` is built at lines 107-114
- `videoRepository.updateSegment(updatedSegment)` at line 116
- task is marked succeeded at lines 142-146

The failure path already does status recovery:

- it restores segment status at lines 160-166
- it derives and writes project status at lines 168-173

So success and failure paths are inconsistent.

### Frontend behavior depends on project status

In `apps/studio/src/components/video-phase-panel.tsx`:

- polling only runs while `project.status === "videos_generating"` at lines 142-171

If the backend never transitions the project out of `videos_generating`, the page remains in the "still generating" lifecycle instead of cleanly entering the review/edit stage.

## Expected Behavior

When prompt/config generation succeeds for a segment:

1. The segment should no longer remain in `generating`.
2. The segment should move into a reviewable state.
3. The project status should be re-derived from all segments in the batch.
4. If no segment is still `generating`, the project should leave `videos_generating`.

For this task, the practical target is:

- set the updated segment status to `in_review`
- derive project status the same way the failure path already does

Expected project result after a normal successful prompt/config generation run:

- usually `videos_in_review`
- `videos_generating` only if some other segment is still `generating`
- `videos_approved` only if every segment is `approved`

## Recommended Implementation

File to change first:

- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`

Suggested approach:

1. In the success path, include `status: "in_review"` in `updatedSegment`.
2. After `videoRepository.updateSegment(updatedSegment)`, load the batch segments.
3. Reuse the existing `deriveProjectVideoStatus(...)` helper for the success path too.
4. Call `projectRepository.updateStatus(...)` with the derived status and the same completion timestamp.

Practical shape:

- keep prompt timestamps as they are now
- use `finishedAt` for the project status update timestamp
- do not change task queue behavior
- do not auto-enqueue segment video generation

## Important Checks Before Editing

Please verify these points while implementing:

- Whether setting segment `status: "in_review"` should also clear `approvedAt`
- Whether there are existing tests or invariants that assume prompt regeneration preserves approval

My current reading is:

- `in_review` is the correct status after prompt/config generation
- but clearing `approvedAt` is a policy decision worth checking before changing it blindly

For this hand-off, the confirmed bug is the missing transition out of `generating`. Avoid widening scope beyond that unless tests force the decision.

## Tests To Add Or Update

### Core use-case test

Primary file:

- `packages/core/tests/process-segment-video-prompt-generate-task.test.ts`

Add assertions that on success:

- `videoRepository.updateSegment(...)` receives `status: "in_review"`
- `projectRepository.updateStatus(...)` is called
- derived project status becomes `videos_in_review` in the single-segment happy path

Recommended extra case:

- if another segment in the same batch is still `generating`, derived project status should remain `videos_generating`

### Optional UI confidence test

Relevant file:

- `apps/studio/tests/integration/video-phase-panel.test.tsx`

You likely do not need a new frontend test if the bug is fixed purely in backend state transitions.

If you add one, keep it narrow:

- simulate a project refresh from `videos_generating` to `videos_in_review`
- verify the panel exits the generating-only presentation and shows the editable review state

## Acceptance Criteria

The task is done when all of the following are true:

- successful prompt/config generation no longer leaves the segment in `generating`
- successful prompt/config generation no longer leaves the project stuck in `videos_generating`
- project status is derived consistently on both success and failure paths
- automated tests cover the new success-path transition

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- process-segment-video-prompt-generate-task
```

If that filter shape does not work in this repo, run:

```powershell
corepack pnpm --filter @sweet-star/core test
```

Optional broader confidence:

```powershell
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

## Relevant Files

- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- `packages/core/tests/process-segment-video-prompt-generate-task.test.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/tests/integration/video-phase-panel.test.tsx`

## Non-Goals

Do not mix this task with:

- removing legacy representative-shot dependencies from segment generation
- audio delete/replace support
- editable reference-material UI
- broader Seedance refactors outside this specific status bug
