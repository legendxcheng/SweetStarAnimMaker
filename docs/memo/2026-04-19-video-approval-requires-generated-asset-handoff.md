# Hand-off: Require Generated Segment Video Assets Before Approval

## Scope

This memo is only for review finding #4:

- Segment approval currently does not require a generated, reviewable video asset.
- Do not broaden this task into prompt-generation finalization, approval invalidation after config edits, project-status derivation during generation, or broader video-phase redesign unless the fix directly depends on them.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Reviewed against commit range `6475220..2ccce95`
- There are already local, uncommitted changes for findings #1, #2, and #3 in:
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/src/use-cases/process-segment-video-generate-task.ts`
  - `packages/core/src/use-cases/save-segment-video-config.ts`
  - `packages/core/src/use-cases/update-video-prompt.ts`
  - `packages/core/src/use-cases/upload-segment-video-audio.ts`
  - `packages/core/src/use-cases/derive-project-video-status.ts`
  - `packages/core/tests/process-segment-video-prompt-generate-task.test.ts`
  - `packages/core/tests/save-segment-video-config.test.ts`
  - `packages/core/tests/update-video-prompt.test.ts`
  - `packages/core/tests/upload-segment-video-audio.test.ts`
  - `apps/studio/src/components/video-phase-panel.tsx`
  - `apps/studio/tests/integration/video-phase-panel.test.tsx`
  - `apps/api/tests/video-api.test.ts`

Avoid overwriting those unrelated edits while addressing this finding.

## Problem Summary

The current video approval flow treats `status === "in_review"` as sufficient for approval, even when the segment does not yet have a generated video clip.

That means an operator can approve a segment after prompt/config preparation but before `segment_video_generate` has produced a reviewable asset.

Practical fallout:

- a segment with `videoAssetPath === null` can still become `approved`
- `approve-all` can mark an entire batch `videos_approved` without every segment having a playable clip
- Studio can show approval counts and phase status that imply review is complete even though some segments have nothing to review
- final cut remains blocked by missing `videoAssetPath`, so the product can end up in a contradictory state: `videos_approved` but not actually ready for final-cut export

This is an approval-readiness bug, not a prompt generation or final-cut rendering bug.

## Why This Happens

### Backend single-approve has no readiness guard

In `packages/core/src/use-cases/approve-video-segment.ts`:

- the use case validates project ownership and current batch membership at lines 29-39
- then immediately stamps the segment `approved` at lines 41-47
- there is no check for:
  - `segment.status === "in_review"` as a reviewable clip state
  - `segment.videoAssetPath` being present

So a prompt-only segment can be promoted to `approved`.

### Backend approve-all blindly approves every segment in the batch

In `packages/core/src/use-cases/approve-all-video-segments.ts`:

- the batch is loaded at lines 35-43
- every segment is rewritten to `status: "approved"` at lines 45-52
- project status is then forced to `videos_approved` at lines 58-62

There is no equivalent of the image-stage or shot-script-stage readiness validation.

### Frontend approval controls only look at status, not asset presence

In `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`:

- the per-segment approve button is enabled whenever `segment.status === "in_review"` at lines 234-240
- the card already knows when there is no playable clip and shows the empty-state UI at lines 107-110
- but that missing-asset state does not disable approval

In `apps/studio/src/components/video-phase-panel.tsx`:

- batch approve is enabled when every segment is `in_review` or `approved` at lines 401-403
- it does not require `videoAssetPath`

So once finding #1 moves prompt generation success into `in_review`, the UI can expose approval controls before any clip exists.

### Other stages already enforce approval readiness

`packages/core/src/use-cases/approve-image-frame.ts` rejects non-ready shots with:

- `ProjectValidationError("Shot reference is not ready for approval")` at lines 52-56

`packages/core/src/use-cases/approve-all-image-frames.ts` only approves shots that pass `isShotReadyForApproval(...)` at lines 51-54.

`packages/core/src/use-cases/approve-all-shot-script-segments.ts` rejects incomplete drafts before approve-all at lines 45-53.

The video stage currently lacks an analogous guard.

### Existing test coverage only exercises happy paths

There are currently no dedicated core test files for:

- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/src/use-cases/approve-all-video-segments.ts`

Current coverage is mostly route/UI happy-path coverage:

- `apps/api/tests/video-api.test.ts:277` approves a segment and then approve-all succeeds
- `apps/studio/tests/integration/video-phase-panel.test.tsx:159` clicks both approve actions in the happy path

There is no negative coverage for:

- approving a segment with `videoAssetPath === null`
- approve-all while any segment is still prompt-only, generating, or failed

## Expected Behavior

The intended workflow in `docs/superpowers/specs/2026-04-18-seedance-segment-video-phase-design.md` is:

- `segment_video_generate -> segment review -> videos_approved`

The design also describes one segment as mapping to one `reviewable video asset`, not merely one editable config.

Practical target for this task:

1. A segment is only approvable when it has a generated clip that can actually be reviewed.
2. Single approve should fail fast when the segment is not ready.
3. Approve-all should not silently promote prompt-only or missing-asset segments.
4. Studio should disable approval controls until the current segment or batch is genuinely reviewable.

Narrow readiness rule recommended for version one:

- ready for approval iff `segment.status === "in_review"` and `segment.videoAssetPath` is non-null

I would not widen the rule beyond that unless tests prove a stricter requirement is needed.

## Recommended Implementation

Primary backend files:

- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/src/use-cases/approve-all-video-segments.ts`

Recommended backend approach:

1. Add a small readiness helper, either local or shared, such as `isSegmentVideoReadyForApproval(segment)`.
2. For single-approve:
   - reject with `ProjectValidationError` when the target segment is not ready
   - only stamp `approvedAt` after readiness is confirmed
3. For approve-all:
   - preserve already approved segments
   - reject if any remaining segment is not ready for approval
   - only then approve the remaining reviewable segments and move the project to `videos_approved`

Why I recommend rejecting approve-all instead of partial approval:

- the current UI label is “全部片段审核通过”, which is all-or-nothing
- the current top-level button is already designed as a gated action, not a best-effort partial approve
- silent partial success would be harder for operators to reason about

Primary frontend follow-up:

- `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- `apps/studio/src/components/video-phase-panel.tsx`

Recommended frontend approach:

1. Disable single-approve unless the segment is approval-ready.
2. Tighten `canApproveAll` so the top-level button is enabled only when every segment is either:
   - already `approved`, or
   - `in_review` with a non-null `videoAssetPath`
3. Keep backend validation authoritative even after the UI is tightened.

Suggested error style:

- reuse `ProjectValidationError`
- message can be simple, e.g. `Segment video is not ready for approval`
- for approve-all, include the first offending segment selector if useful

## Important Checks Before Editing

Please verify these points while implementing:

- Whether `videoAssetPath` alone is the correct readiness signal, or whether the team also expects `thumbnailAssetPath`, `provider`, or `model`
- Whether approve-all should reject on the first non-ready segment, or whether the product intentionally wants image-stage-style partial approval
- Whether there are already persisted bad states from manual testing that need one-off cleanup, or whether this task should only prevent new invalid approvals

My current reading is:

- `videoAssetPath` is the right minimum readiness signal
- approve-all should reject, not partially approve
- data repair should stay out of scope unless the user explicitly asks for it

## Tests To Add Or Update

### Core use-case tests

Create dedicated tests:

- `packages/core/tests/approve-video-segment.test.ts`
- `packages/core/tests/approve-all-video-segments.test.ts`

Recommended cases for single approve:

- happy path: `in_review` + `videoAssetPath` present => succeeds
- reject when `videoAssetPath` is null
- reject when status is `generating`
- reject when status is `failed`

Recommended cases for approve-all:

- happy path: all segments are already approved or approval-ready => succeeds and moves project to `videos_approved`
- reject when any segment has `videoAssetPath === null`
- reject when any segment is still `generating`
- reject when any segment is `failed`

### API confidence tests

Relevant file:

- `apps/api/tests/video-api.test.ts`

Add narrow route-level failures that verify:

- `POST /projects/:projectId/videos/segments/:videoId/approve` returns `400` for a segment with no clip
- `POST /projects/:projectId/videos/approve-all` returns `400` when any segment in the batch is not approval-ready

### UI confidence tests

Relevant file:

- `apps/studio/tests/integration/video-phase-panel.test.tsx`

Add UI expectations that:

- a segment with `status: "in_review"` but `videoAssetPath: null` does not enable `审核通过当前 Segment`
- the top-level `全部片段审核通过` button stays disabled while any segment lacks a playable clip

## Acceptance Criteria

The task is done when all of the following are true:

- a segment cannot be approved before it has a generated reviewable video clip
- approve-all cannot move the batch to `videos_approved` while any segment is still prompt-only, generating, or failed
- Studio does not expose approval actions for non-reviewable segments
- automated tests cover both the single-approve and approve-all negative cases

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- approve-video-segment approve-all-video-segments
```

If those file-name filters do not work in this repo, run:

```powershell
corepack pnpm --filter @sweet-star/core test
```

Optional broader confidence:

```powershell
corepack pnpm --filter @sweet-star/api test -- video-api
```

```powershell
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

## Relevant Files

- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/src/use-cases/approve-all-video-segments.ts`
- `packages/core/src/errors/project-errors.ts`
- `packages/core/src/use-cases/approve-image-frame.ts`
- `packages/core/src/use-cases/approve-all-image-frames.ts`
- `packages/core/src/use-cases/approve-all-shot-script-segments.ts`
- `apps/api/tests/video-api.test.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- `apps/studio/tests/integration/video-phase-panel.test.tsx`
- `docs/superpowers/specs/2026-04-18-seedance-segment-video-phase-design.md`

## Non-Goals

Do not mix this task with:

- prompt/config edit approval invalidation
- prompt-generation success-path status finalization
- project status derivation while other segment videos are still generating
- retroactive cleanup of already-corrupted approval rows unless the user explicitly asks for data repair
- broader final-cut UX or storage changes
