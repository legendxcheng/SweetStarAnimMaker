# Hand-off: Keep Project In `videos_generating` Until All Segment Videos Finish

## Scope

This memo is only for review finding #3:

- Successful segment video generation can move the project out of `videos_generating` too early.
- Do not broaden this task into prompt-generation finalization, approval invalidation, or other video-phase review findings unless the fix directly depends on them.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Reviewed against commit range `6475220..2ccce95`
- There are already local, uncommitted changes for findings #1 and #2 in:
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/src/use-cases/save-segment-video-config.ts`
  - `packages/core/src/use-cases/update-video-prompt.ts`
  - `packages/core/src/use-cases/upload-segment-video-audio.ts`
  - `packages/core/src/use-cases/derive-project-video-status.ts`
  - related test and UI files from the same flows

Avoid overwriting those unrelated edits while addressing this finding.

## Problem Summary

When one segment video finishes successfully, the success path in the async generate-task use case always writes:

- `project.status = "videos_in_review"`

That is only correct when no other segment in the same batch is still `generating`.

If another segment is still running, the project should remain `videos_generating` until the batch is actually out of the generating phase.

This is a project-status derivation bug on the success path of segment video generation, not a provider integration bug.

## Why This Happens

### Backend success path hard-codes the wrong project status

In `packages/core/src/use-cases/process-segment-video-generate-task.ts`:

- the success path builds `updatedSegment` at lines 157-168
- persists it with `videoRepository.updateSegment(updatedSegment)` at line 193
- then immediately calls `projectRepository.updateStatus(...)` with hard-coded `status: "videos_in_review"` at lines 194-198

The failure path in the same file already does the correct thing:

- it restores the segment state at lines 232-236
- loads all batch segments at line 240
- derives project status with `deriveProjectVideoStatus(...)` at lines 241-244

So success and failure paths are inconsistent.

### Current tests encode the wrong behavior

In `packages/core/tests/process-segment-video-generate-task.test.ts`:

- the main happy-path test title explicitly says it "moves the project into `videos_in_review`" at line 6
- it asserts `projectRepository.updateStatus(...)` receives `videos_in_review` at lines 247-251

That covers only the single-segment happy path and currently bakes the bug into the test file.

### Frontend auto-refresh depends on `videos_generating`

In `apps/studio/src/components/video-phase-panel.tsx`:

- polling runs only while `project.status === "videos_generating"` at lines 142-171

If backend status is downgraded to `videos_in_review` after the first finished segment, the page can stop polling even though other segments are still generating.

Practical effect:

- the "still generating" banner disappears too early
- the project appears to leave generating state before the batch is actually done
- remaining segment completions may not auto-refresh into the UI

## Expected Behavior

When one segment video generation succeeds:

1. The finished segment should move to `in_review`.
2. The project status should be re-derived from all segments in the batch.
3. If any other segment is still `generating`, the project must remain `videos_generating`.
4. Only when no segment is still `generating` should the project leave generating state.

For this task, the practical target is:

- keep the current segment success semantics
- replace the hard-coded project status write with derived status logic

Expected project result after a successful segment video generation run:

- `videos_generating` if some other segment is still `generating`
- `videos_in_review` once no segment is generating and at least one segment is still awaiting approval
- not `videos_approved` on this success path, because the newly generated segment lands in `in_review`

## Recommended Implementation

Primary file:

- `packages/core/src/use-cases/process-segment-video-generate-task.ts`

Recommended approach:

1. Keep the success-path `updatedSegment.status = "in_review"` behavior.
2. After `videoRepository.updateSegment(updatedSegment)`, load all segments in the batch.
3. Derive the project status from the full segment list plus `updatedSegment`.
4. Call `projectRepository.updateStatus(...)` with that derived value instead of hard-coding `videos_in_review`.

Good reference:

- `deriveProjectVideoStatus(...)` already exists in `packages/core/src/use-cases/derive-project-video-status.ts` in the current workspace
- the failure path in `process-segment-video-generate-task.ts` already uses the same helper at lines 240-244

Practical shape:

- mirror the failure-path derivation logic on success
- use the same `finishedAt` timestamp for the project status update
- do not change task queue behavior
- do not widen the fix into approval-reset or prompt-generation flows

## Important Checks Before Editing

Please verify these points while implementing:

- Whether the success path should use the shared `deriveProjectVideoStatus(...)` helper directly or keep a local equivalent if working from a clean branch without the current uncommitted helper extraction
- Whether any existing tests assume every successful segment generation should always force `videos_in_review`

My current reading is:

- the hard-coded `videos_in_review` write is the actual bug
- the helper-based derivation is the correct fix
- the current single-segment happy-path test should stay valid, but only because its fixture has no other generating segment

## Tests To Add Or Update

### Core use-case test

Primary file:

- `packages/core/tests/process-segment-video-generate-task.test.ts`

Update or add assertions that:

- the single-segment happy path still ends in `videos_in_review`
- if another segment in the same batch is still `generating`, `projectRepository.updateStatus(...)` receives `videos_generating`

Recommended extra case:

- use a batch list where the persisted repository state still shows the current segment as `generating`, and verify the helper correctly replaces it with the in-memory `updatedSegment`

### Optional UI confidence test

Relevant file:

- `apps/studio/tests/integration/video-phase-panel.test.tsx`

You likely do not need a new frontend test if the backend state transition is fixed correctly.

If you add one, keep it narrow:

- simulate a project that remains `videos_generating` after one segment finishes while another is still running
- verify the panel keeps the polling/generating lifecycle active

## Acceptance Criteria

The task is done when all of the following are true:

- successful segment video generation no longer forces the project to `videos_in_review` when other segments are still generating
- project status derivation is consistent between the success and failure paths of segment video generation
- the single-segment happy path still resolves to `videos_in_review`
- automated tests cover the multi-segment generating case

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- process-segment-video-generate-task
```

Optional broader confidence:

```powershell
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

## Relevant Files

- `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- `packages/core/src/use-cases/derive-project-video-status.ts`
- `packages/core/tests/process-segment-video-generate-task.test.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/tests/integration/video-phase-panel.test.tsx`

## Non-Goals

Do not mix this task with:

- prompt/config generation success finalization
- config edit or audio upload approval invalidation
- broader video-phase UI redesign
- final-cut generation policy changes outside keeping the project status truthful during active segment generation
