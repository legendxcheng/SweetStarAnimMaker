# Hand-off: Revoke Video Approval After Segment Config Edits

## Scope

This memo is only for review finding #2:

- Editing a segment video config or uploading a new reference audio does not revoke approval.
- Do not broaden this task into prompt-generation finalization or other video-phase review findings unless the fix directly depends on them.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Reviewed against commit range `6475220..2ccce95`
- There are already local, uncommitted changes for finding #1 in:
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/tests/process-segment-video-prompt-generate-task.test.ts`

Avoid overwriting those unrelated edits while addressing this finding.

## Problem Summary

The new segment-first video workflow lets operators:

- save edited segment config via `/videos/segments/:videoId/config`
- hit the legacy prompt alias via `/videos/segments/:videoId/prompt`
- upload new reference audio via `/videos/segments/:videoId/reference-audios`

But those edit paths only mutate the stored config. They do not revoke `approved` state on the segment, and they do not re-derive project status.

As a result:

- an already approved segment can keep `status === "approved"` and a non-null `approvedAt` after its prompt or reference audio changes
- the project can remain `videos_approved`
- the UI can keep showing all segments approved and leave final-cut generation enabled
- final cut can still be created from stale approved video assets that no longer match the edited config

This is an approval invalidation bug, not a prompt saving or file upload capability bug.

## Why This Happens

### Backend edit paths only update content fields

In `packages/core/src/use-cases/save-segment-video-config.ts`:

- the success path updates `promptTextCurrent`, `referenceImages`, `referenceAudios`, `promptUpdatedAt`, and `updatedAt`
- it does not change `status`
- it does not clear `approvedAt`
- it does not call `projectRepository.updateStatus(...)`

Relevant lines at current `HEAD`:

- read and validation at lines 31-49
- `updatedSegment` is built at lines 50-58
- `videoRepository.updateSegment(updatedSegment)` at line 60

In `packages/core/src/use-cases/upload-segment-video-audio.ts`:

- the success path appends a new `referenceAudios` entry and updates `updatedAt`
- it does not change `status`
- it does not clear `approvedAt`
- it does not call `projectRepository.updateStatus(...)`

Relevant lines at current `HEAD`:

- segment lookup at lines 39-49
- `updatedSegment` is built at lines 63-78
- `videoRepository.updateSegment(updatedSegment)` at line 80

The existing tests currently assert only data mutation, not approval invalidation:

- `packages/core/tests/save-segment-video-config.test.ts:8`
- `packages/core/tests/upload-segment-video-audio.test.ts:8`

### Downstream gates still trust approval state

In `packages/core/src/use-cases/create-final-cut-generate-task.ts`:

- final cut is allowed whenever every segment is still `approved` and has a `videoAssetPath`
- see lines 58-64

If config edits leave a segment approved, backend final-cut generation still accepts that batch.

### Frontend keeps stale approval summary after edit

In `apps/studio/src/components/video-phase-panel.tsx`:

- the final-cut button state is derived from `project.currentVideoBatch.approvedSegmentCount` at lines 49-53
- `handleSaveConfig(...)` only updates the local segment row and does not refresh project detail at lines 280-301
- `handleUploadAudio(...)` only updates the local segment row and does not refresh project detail at lines 304-315

In `apps/studio/src/components/video-phase-panel/final-cut-card.tsx`:

- the final-cut button is disabled only when `allShotsApproved` is false at lines 44-51

So even after backend is fixed, the panel likely still needs a project refresh after config/audio edits to reflect downgraded approval counts and project status.

## Expected Behavior

When an operator changes a segment config in a way that can invalidate the approved output:

1. If the segment was `approved`, it should no longer remain approved.
2. `approvedAt` should be cleared for that segment.
3. The segment should move back to `in_review`.
4. The project status should be re-derived from the full batch.
5. If any segment is still `generating`, the project should remain `videos_generating`.
6. Otherwise, if not all segments are approved anymore, the project should become `videos_in_review`.
7. Final-cut generation should no longer remain available on stale approvals.

For this task, the practical target is:

- revoke approval when saving config through the new `/config` flow
- keep the legacy `/prompt` alias behavior consistent
- revoke approval when uploading reference audio
- refresh the video-phase project summary after those mutations

## Recommended Implementation

Primary backend files:

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`

Recommended backend approach:

1. Detect whether the existing segment is currently approved.
2. For approved segments, set:
   - `status: "in_review"`
   - `approvedAt: null`
3. After `videoRepository.updateSegment(...)`, load all batch segments.
4. Reuse existing project-status derivation logic rather than hard-coding `videos_in_review`.

Good existing reference helpers:

- `deriveProjectVideoStatus(...)` in `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts:195`
- `deriveProjectVideoStatus(...)` in `packages/core/src/use-cases/process-segment-video-generate-task.ts`

Practical shape:

- if the segment was already `in_review`, `generating`, or `failed`, do not invent a larger behavior change unless tests show it is required
- keep prompt and reference data mutation behavior as-is
- only widen the fix enough to preserve review correctness

Primary frontend follow-up:

- `apps/studio/src/components/video-phase-panel.tsx`

Recommended frontend approach:

1. After successful `saveSegmentVideoConfig(...)`, call `refreshProject()` in addition to local row update.
2. After successful `uploadSegmentReferenceAudio(...)`, call `refreshProject()` too.
3. Only do extra list refresh if needed; the route already returns the updated segment row.

The backend is the real fix. The frontend refresh is the confidence layer that prevents stale `approvedSegmentCount` and stale final-cut button state in the current screen.

## Important Checks Before Editing

Please verify these points while implementing:

- Whether approval should be revoked only when the segment was previously `approved`, or for any edit regardless of prior status
- Whether the legacy `/prompt` route is still intentionally supported and should remain behaviorally identical to `/config`
- Whether there are API or UI tests that depend on saved prompt edits preserving `approvedAt`

My current reading is:

- revoking approval only for previously approved segments is the narrowest defensible fix
- `/prompt` should not diverge from `/config`, because both mutate review-relevant config
- audio upload definitely changes generation inputs and therefore should also revoke approval

## Tests To Add Or Update

### Core use-case tests

Primary files:

- `packages/core/tests/save-segment-video-config.test.ts`
- `packages/core/tests/upload-segment-video-audio.test.ts`

Add assertions that when the starting segment is approved:

- `videoRepository.updateSegment(...)` receives `status: "in_review"`
- `videoRepository.updateSegment(...)` receives `approvedAt: null`
- `projectRepository.updateStatus(...)` is called
- derived project status becomes `videos_in_review` in the simple single-segment approved case

Recommended extra cases:

- if another segment in the same batch is still `generating`, the project status remains `videos_generating`
- if the edited segment was already `in_review`, the use case does not unexpectedly promote or otherwise rewrite status semantics

### Legacy prompt alias test

Relevant file:

- `packages/core/tests/update-video-prompt.test.ts`

Add the same approval-reset expectation there if the alias remains live.

### API confidence test

Relevant file:

- `apps/api/tests/video-api.test.ts`

Add a narrow route-level case that:

- starts from `videos_approved`
- saves config or uploads audio for an approved segment
- observes the returned segment downgraded to `in_review`
- confirms project detail no longer remains `videos_approved`

### UI confidence test

Relevant file:

- `apps/studio/tests/integration/video-phase-panel.test.tsx`

If you add a UI test, keep it narrow:

- start with a batch that is fully approved
- save config or upload audio on one segment
- verify the panel refreshes out of the fully-approved state and final-cut generation is no longer available

## Acceptance Criteria

The task is done when all of the following are true:

- saving config on an approved segment clears that segment’s approval
- uploading reference audio on an approved segment clears that segment’s approval
- the project no longer remains `videos_approved` after those edits unless every segment is still genuinely approved
- final cut can no longer be started based on stale approval after a config/audio edit
- automated tests cover the approval-reset behavior

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- save-segment-video-config
```

```powershell
corepack pnpm --filter @sweet-star/core test -- upload-segment-video-audio
```

If the legacy prompt alias is updated too:

```powershell
corepack pnpm --filter @sweet-star/core test -- update-video-prompt
```

Optional broader confidence:

```powershell
corepack pnpm --filter @sweet-star/api test -- video-api
```

```powershell
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

## Relevant Files

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`
- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- `packages/core/src/use-cases/create-final-cut-generate-task.ts`
- `packages/core/tests/save-segment-video-config.test.ts`
- `packages/core/tests/update-video-prompt.test.ts`
- `packages/core/tests/upload-segment-video-audio.test.ts`
- `apps/api/tests/video-api.test.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/src/components/video-phase-panel/final-cut-card.tsx`
- `apps/studio/tests/integration/video-phase-panel.test.tsx`

## Non-Goals

Do not mix this task with:

- prompt-generation success/failure status finalization
- removing remaining legacy shot-level fields from internal video entities
- broader video-phase UX redesigns beyond keeping approval and final-cut gating truthful
- deleting or redesigning the legacy `/prompt` alias unless the fix directly requires it
