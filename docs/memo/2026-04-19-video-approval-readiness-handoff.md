# Hand-off: Require Reviewable Segment Video Assets Before Approval

## Scope

This memo is for the current review's finding #1:

- Prompt-only segment videos can still be approved.
- Segment approval must require a generated, reviewable video asset.
- Do not broaden this task into prompt regeneration approval invalidation, config edit invalidation, current-batch guards, or generation status derivation unless the fix directly depends on approval readiness.

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- The workspace already has local, uncommitted changes for adjacent video-phase findings.
- Avoid reverting or overwriting unrelated local edits, especially in:
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/src/use-cases/process-segment-video-generate-task.ts`
  - `packages/core/src/use-cases/regenerate-video-prompt.ts`
  - `packages/core/src/use-cases/regenerate-all-video-prompts.ts`
  - `packages/core/src/use-cases/save-segment-video-config.ts`
  - `packages/core/src/use-cases/update-video-prompt.ts`
  - `packages/core/src/use-cases/upload-segment-video-audio.ts`
  - `apps/studio/src/components/video-phase-panel.tsx`

## Problem Summary

The video phase now has states where a segment can be `in_review` after prompt/config preparation but before a video clip has been generated.

The approval flow currently treats status alone as sufficient:

- `approve-video-segment` unconditionally stamps the target segment as `approved`
- `approve-all-video-segments` unconditionally stamps every segment in the batch as `approved`
- Studio enables approval actions for `in_review` segments even when `videoAssetPath` is `null`

That allows a prompt-only segment to become approved without a playable clip. The project can then incorrectly move to `videos_approved`, while final-cut generation may still be blocked by missing assets. The result is a contradictory project state: approved in lifecycle status, but not actually reviewable or export-ready.

## Why This Happens

### Single-segment approval has no asset readiness guard

Relevant file:

- `packages/core/src/use-cases/approve-video-segment.ts`

Current behavior:

1. loads project
2. loads segment by `videoId`
3. checks project/current batch ownership
4. writes:
   - `status: "approved"`
   - `approvedAt: timestamp`

Missing validation:

- `segment.status === "in_review"`
- `segment.videoAssetPath !== null`

### Batch approval approves every segment blindly

Relevant file:

- `packages/core/src/use-cases/approve-all-video-segments.ts`

Current behavior:

1. loads current video batch
2. lists all segments
3. maps every segment to `status: "approved"`
4. forces project status to `videos_approved`

Missing validation:

- already-approved segments should be allowed to remain approved
- non-approved segments must be review-ready before being approved
- prompt-only, generating, failed, or missing-video segments should reject the whole approve-all request

### Studio exposes approval controls too early

Relevant files:

- `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- `apps/studio/src/components/video-phase-panel.tsx`

Current UI behavior:

- Single approve button is enabled when `segment.status === "in_review"`
- Batch approve button is enabled when every segment is `in_review` or `approved`

Missing UI check:

- an `in_review` segment must also have `videoAssetPath` before approval controls are enabled

Backend validation is still authoritative; UI gating is only a safety and UX layer.

## Expected Behavior

A segment video is ready for approval only when:

- `segment.status === "in_review"`
- `segment.videoAssetPath` is present

Single approve should:

- approve only review-ready current-batch segments
- reject prompt-only segments with no `videoAssetPath`
- reject `generating` or `failed` segments
- preserve the existing current-batch guard
- update project status to `videos_approved` only when all current-batch segments are approved

Approve-all should:

- preserve already-approved segments
- require every non-approved segment to be review-ready
- reject the whole operation if any segment is prompt-only, generating, failed, or missing `videoAssetPath`
- update project status to `videos_approved` only after every segment is valid and approved

Studio should:

- disable per-segment approve if the segment is not review-ready
- disable approve-all unless every segment is either already approved or review-ready

## Recommended Implementation

### Backend readiness rule

Use the narrow rule:

```ts
function isSegmentVideoReadyForApproval(segment: {
  status: string;
  videoAssetPath: string | null;
}) {
  return segment.status === "in_review" && segment.videoAssetPath !== null;
}
```

This helper can be local to each file or extracted to a small shared core use-case helper if duplication becomes awkward. Do not move it into `@sweet-star/shared` unless there is already a clear shared-domain pattern for this.

### Single approve

Modify:

- `packages/core/src/use-cases/approve-video-segment.ts`

Recommended behavior:

1. Keep the existing project lookup and current-batch guard.
2. Before stamping approval, reject if the segment is not review-ready.
3. Use `ProjectValidationError`, with a direct message such as:
   - `Segment video is not ready for approval`
4. Keep the existing project status update logic after approval.

Important: do not allow `approved` segments to be approved again unless the existing behavior explicitly needs idempotency. If preserving idempotency is desired, make it explicit in tests. The simplest narrow fix is to require `in_review + videoAssetPath`.

### Approve all

Modify:

- `packages/core/src/use-cases/approve-all-video-segments.ts`

Recommended behavior:

1. Load the current video batch and its segments as today.
2. Validate before writing any segment updates.
3. Treat each segment as valid if either:
   - `segment.status === "approved"` and `segment.videoAssetPath !== null`
   - `segment.status === "in_review"` and `segment.videoAssetPath !== null`
4. If any segment is invalid, throw `ProjectValidationError`.
5. After validation passes, approve only segments that are not already approved, or keep the current update-all approach if tests confirm unchanged `approvedAt` is preserved.
6. Update project status to `videos_approved` after successful writes.

Recommended failure message:

- `All segment videos must be generated before approval`

If useful, include the first failing segment id in the message, but keep tests resilient enough not to depend on a verbose string unless the API contract already requires it.

### Studio gating

Modify:

- `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- `apps/studio/src/components/video-phase-panel.tsx`

Recommended UI predicates:

```ts
function isSegmentVideoReadyForApproval(segment: SegmentVideoRecord) {
  return segment.status === "in_review" && segment.videoAssetPath !== null;
}

function isSegmentVideoApprovedOrReady(segment: SegmentVideoRecord) {
  return segment.status === "approved" || isSegmentVideoReadyForApproval(segment);
}
```

Apply them to:

- the per-card approve button disabled state
- the top-level `canApproveAll` calculation

Do not rely only on UI gating. Backend tests are required.

## Tests To Add Or Update

### Core tests: single approve

Create or update:

- `packages/core/tests/approve-video-segment.test.ts`

Add cases:

- approving `in_review` segment with `videoAssetPath` succeeds
- approving `in_review` segment with `videoAssetPath: null` rejects
- approving `generating` segment rejects even if it has a path
- approving `failed` segment rejects
- rejected approval does not call `videoRepository.updateSegment`
- rejected approval does not call `projectRepository.updateStatus`

### Core tests: approve all

Create or update:

- `packages/core/tests/approve-all-video-segments.test.ts`

Add cases:

- all segments approved or review-ready succeeds and moves project to `videos_approved`
- already approved segments preserve existing `approvedAt`
- batch with any `in_review` segment missing `videoAssetPath` rejects
- batch with any `generating` segment rejects
- batch with any `failed` segment rejects
- rejected approve-all does not update any segment
- rejected approve-all does not update project status

### API confidence tests

Update:

- `apps/api/tests/video-api.test.ts`

Add narrow route-level coverage:

- `POST /projects/:projectId/videos/segments/:videoId/approve` returns `400` for an `in_review` segment with no clip
- `POST /projects/:projectId/videos/approve-all` returns `400` when at least one current-batch segment has no generated video asset

Keep these tests focused on API behavior. Core tests should cover the detailed state invariants.

### Studio tests

Update:

- `apps/studio/tests/integration/video-phase-panel.test.tsx`

Add UI expectations:

- a segment with `status: "in_review"` and `videoAssetPath: null` shows no playable video and keeps `审核通过当前 Segment` disabled
- `全部片段审核通过` stays disabled if any segment is `in_review` but missing `videoAssetPath`
- approval controls are enabled when all non-approved segments have `videoAssetPath`

## Suggested Task Plan

- [ ] Add failing core tests for `approve-video-segment` readiness validation.
- [ ] Implement the minimal single-approve readiness check.
- [ ] Run the single-approve test file and confirm it passes.
- [ ] Add failing core tests for `approve-all-video-segments` readiness validation.
- [ ] Implement approve-all validation before mutation.
- [ ] Run the approve-all test file and confirm it passes.
- [ ] Add API confidence tests for single approve and approve-all rejection.
- [ ] Run the API video test.
- [ ] Tighten Studio approval button gating.
- [ ] Add Studio integration coverage for disabled approval controls.
- [ ] Run the Studio video-phase-panel test.
- [ ] Run a final targeted verification set.

## Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- approve-video-segment approve-all-video-segments
```

Run API confidence:

```powershell
corepack pnpm --filter @sweet-star/api test -- video-api
```

Run Studio confidence:

```powershell
corepack pnpm --filter @sweet-star/studio test -- video-phase-panel
```

If the Studio command reports unrelated failures, record the exact failing file/test and still report whether the new video-phase assertions passed.

## Acceptance Criteria

- Single segment approval rejects segments without generated video assets.
- Single segment approval rejects `generating` and `failed` segments.
- Approve-all rejects if any current-batch segment is not approved and not review-ready.
- Rejected approval attempts do not mutate segment records.
- Rejected approval attempts do not mutate project status.
- Studio does not enable approval controls for prompt-only segments.
- Automated tests cover backend, API, and UI readiness behavior.

## Non-Goals

Do not include:

- changing prompt generation status semantics
- changing regeneration approval invalidation logic
- changing config/audio edit invalidation logic
- changing historical batch guards
- changing final-cut generation policy beyond preventing invalid approval state
- retroactive data repair for already-invalid approved rows
