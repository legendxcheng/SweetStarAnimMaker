# Hand-off: Review Finding #1 - Do Not Leave `videos_generating` Early On Segment Video Success

## Scope

This memo is only for the latest review finding #1:

- A successful segment video generation can move the project out of `videos_generating` too early.
- Do not mix this task with prompt regeneration, approval readiness, approval revocation, current-batch guards, or unrelated Studio polish unless the fix directly depends on it.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Current `HEAD`: `2ccce95 feat: redesign video phase for seedance segments`
- The worktree already contains unrelated local edits in multiple video-phase files. Do not overwrite those changes while fixing this issue.

## Problem Summary

The success path in `process-segment-video-generate-task` hard-codes:

- `project.status = "videos_in_review"`

That is only correct when no other segment in the same batch is still `generating`.

If at least one other segment is still generating, the project must remain `videos_generating`.

This is a project-status derivation bug on the success path of segment video generation.

## Why This Is A Real Bug

In [packages/core/src/use-cases/process-segment-video-generate-task.ts](E:/SweetStarAnimMaker/packages/core/src/use-cases/process-segment-video-generate-task.ts):

- the success path updates the finished segment to `in_review`
- then immediately writes project status as `videos_in_review`

The failure path in the same file already does the correct thing:

- it reloads the batch segments
- it calls `deriveProjectVideoStatus(...)`

So success and failure paths are inconsistent.

This inconsistency is user-visible because Studio only auto-polls while the project is still `videos_generating`:

- see [apps/studio/src/pages/project-detail-page.tsx#L244](E:/SweetStarAnimMaker/apps/studio/src/pages/project-detail-page.tsx#L244)
- see [apps/studio/src/components/video-phase-panel.tsx#L142](E:/SweetStarAnimMaker/apps/studio/src/components/video-phase-panel.tsx#L142)

If the first finished segment flips the project to `videos_in_review` while another segment is still generating:

- project-level polling can stop too early
- the "generating" state disappears too early
- remaining segment completions may not surface automatically in the current screen

## Expected Behavior

When one segment video generation succeeds:

1. The finished segment should become `in_review`.
2. The project status should be re-derived from the whole batch.
3. If any other segment is still `generating`, the project stays `videos_generating`.
4. Only when no segment is generating should the project leave the generating phase.

Expected derived status after success:

- `videos_generating` if another segment is still `generating`
- `videos_in_review` if no segment is generating and at least one segment still needs approval
- not `videos_approved`, because the just-finished segment lands in `in_review`

## Recommended Fix

Primary file:

- [packages/core/src/use-cases/process-segment-video-generate-task.ts](E:/SweetStarAnimMaker/packages/core/src/use-cases/process-segment-video-generate-task.ts)

Use the same derivation approach already used in the failure path:

1. Keep `updatedSegment.status = "in_review"`.
2. After `videoRepository.updateSegment(updatedSegment)`, load the batch with `listSegmentsByBatchId(...)`.
3. Derive the next project status with `deriveProjectVideoStatus(...)`.
4. Replace the hard-coded `videos_in_review` write with the derived status.

Reference helper:

- [packages/core/src/use-cases/derive-project-video-status.ts](E:/SweetStarAnimMaker/packages/core/src/use-cases/derive-project-video-status.ts)

Important detail:

- The repository snapshot may still contain the current segment as `generating`, so the derivation should overlay the persisted list with `updatedSegment`, same as other call sites already do.

## Tests To Update

Primary test file:

- [packages/core/tests/process-segment-video-generate-task.test.ts](E:/SweetStarAnimMaker/packages/core/tests/process-segment-video-generate-task.test.ts)

Required coverage:

- The existing single-segment happy path should still expect `videos_in_review`.
- Add a case where another segment in the same batch is still `generating`; expect `projectRepository.updateStatus(...)` to receive `videos_generating`.

Optional UI confidence:

- [apps/studio/tests/integration/video-phase-panel.test.tsx](E:/SweetStarAnimMaker/apps/studio/tests/integration/video-phase-panel.test.tsx)

This is probably unnecessary if the backend fix is covered well, but it is acceptable to add a narrow polling-state regression test if needed.

## Acceptance Criteria

The hand-off can be considered complete when all of these are true:

- A successful segment video generation no longer forces the project to `videos_in_review` while another segment is still generating.
- Success and failure paths in `process-segment-video-generate-task` use consistent project-status derivation rules.
- The single-segment happy path still resolves to `videos_in_review`.
- Automated tests cover the multi-segment generating case.

## Verification

Minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- process-segment-video-generate-task
```

Recommended:

```powershell
corepack pnpm --filter @sweet-star/core test -- process-segment-video-generate-task process-segment-video-prompt-generate-task
corepack pnpm typecheck
```

## Relevant Files

- [packages/core/src/use-cases/process-segment-video-generate-task.ts](E:/SweetStarAnimMaker/packages/core/src/use-cases/process-segment-video-generate-task.ts)
- [packages/core/src/use-cases/derive-project-video-status.ts](E:/SweetStarAnimMaker/packages/core/src/use-cases/derive-project-video-status.ts)
- [packages/core/tests/process-segment-video-generate-task.test.ts](E:/SweetStarAnimMaker/packages/core/tests/process-segment-video-generate-task.test.ts)
- [apps/studio/src/pages/project-detail-page.tsx](E:/SweetStarAnimMaker/apps/studio/src/pages/project-detail-page.tsx)
- [apps/studio/src/components/video-phase-panel.tsx](E:/SweetStarAnimMaker/apps/studio/src/components/video-phase-panel.tsx)

## Non-Goals

Do not expand this task into:

- prompt-generation status fixes
- approval readiness checks
- approval revocation after edits
- historical-batch guards
- final-cut policy changes
- unrelated Studio refactors
