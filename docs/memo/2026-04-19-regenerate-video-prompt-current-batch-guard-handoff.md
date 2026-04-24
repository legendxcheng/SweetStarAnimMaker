# Hand-off: Restrict Single-Segment Video Prompt Regeneration To The Current Batch

## Scope

This memo is only for review finding #3 from the latest review:

- `POST /projects/:projectId/videos/segments/:videoId/regenerate-prompt` can still mutate a historical batch segment
- do not broaden this task into approval invalidation, approval-readiness checks, segment-video success status derivation, or other video-phase findings unless the fix directly depends on them

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Current `HEAD`: `2ccce95a379ca24f13160fc7aa836cad523d29d7`
- There are already local, uncommitted edits in related video-phase files, including:
  - `packages/core/src/use-cases/process-segment-video-generate-task.ts`
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/src/use-cases/regenerate-all-video-prompts.ts`
  - `packages/core/src/use-cases/save-segment-video-config.ts`
  - `packages/core/src/use-cases/update-video-prompt.ts`
  - `packages/core/src/use-cases/upload-segment-video-audio.ts`
  - `packages/core/src/use-cases/approve-video-segment.ts`
  - `packages/core/src/use-cases/approve-all-video-segments.ts`
  - `packages/core/src/use-cases/derive-project-video-status.ts`
  - related test and Studio files under `packages/core/tests` and `apps/**`

Avoid overwriting unrelated local edits while addressing this finding.

## Problem Summary

The single-segment prompt regeneration route:

- `POST /projects/:projectId/videos/segments/:videoId/regenerate-prompt`

still loads the segment by raw persisted record id and only verifies project ownership:

- `segment.projectId === project.id`

It does not verify:

- `segment.batchId === project.currentVideoBatchId`

As a result, if `videoId` belongs to an older video batch for the same project, the request can still succeed, regenerate prompt content onto that historical record, and then overwrite the current project's status using the old batch snapshot.

Practical fallout:

- an old segment record can still be mutated through a current-batch route shape
- `project.status` can be re-derived from the wrong batch
- `currentVideoBatch.approvedSegmentCount` and final-cut gating can drift away from the actual active batch
- route behavior becomes inconsistent with the other segment-video mutation endpoints that now reject historical batch ids

This is a current-batch authorization/targeting bug on the single-segment prompt-regeneration path, not primarily a prompt-regeneration semantics issue.

## Why This Happens

### `regenerate-video-prompt` still lacks the current-batch guard

In `packages/core/src/use-cases/regenerate-video-prompt.ts`, the current flow is:

1. load `project`
2. load `currentSegment` by `findSegmentById(input.videoId)`
3. validate only that `currentSegment.projectId === project.id`
4. load the current shot script
5. regenerate prompt text
6. update the segment
7. call `projectRepository.updateStatus(...)` from `currentSegment.batchId`

That last step is only safe if the segment is guaranteed to belong to `project.currentVideoBatchId`.

### Other segment-video routes already enforce current-batch ownership

There is already clear precedent that `/videos/segments/:videoId/...` endpoints are supposed to target only the active batch.

Reference implementations:

- `packages/core/src/use-cases/get-video.ts`
- `packages/core/src/use-cases/regenerate-video-segment.ts`
- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`

Those paths reject the request when:

- the segment belongs to a different project, or
- the segment's `batchId` does not equal `project.currentVideoBatchId`

`regenerate-video-prompt.ts` is now the outlier.

### Route identity is the persisted `videoId`, not logical `segmentId`

Do not replace this with a logical-segment lookup API.

This route accepts the persisted segment record id:

- `/videos/segments/:videoId/regenerate-prompt`

and there are already cases where logical segment ids can repeat across scenes or batches.

That means the narrow safe fix is:

- keep `findSegmentById(input.videoId)`
- add the current-batch membership guard after load

Do not switch this route to `findCurrentSegmentByProjectIdAndSegmentId(...)`, because that uses a different identifier and can target the wrong record shape.

## Expected Behavior

For `POST /projects/:projectId/videos/segments/:videoId/regenerate-prompt`:

1. The route should only operate on the project's current video batch.
2. If the referenced `videoId` belongs to an older batch, the request should fail as not found for this route.
3. No prompt regeneration should be persisted onto historical batch records.
4. No project status update should be derived from historical batch records.
5. Existing current-batch behavior should remain intact.

The narrow behavior target is:

- current batch segment: allowed
- stale batch segment: rejected

## Recommended Implementation

Primary file:

- `packages/core/src/use-cases/regenerate-video-prompt.ts`

Recommended approach:

1. Keep the initial `findSegmentById(input.videoId)` lookup.
2. After loading `project` and `currentSegment`, require:
   - `currentSegment.projectId === project.id`
   - `currentSegment.batchId === project.currentVideoBatchId`
3. If either check fails, throw `SegmentVideoNotFoundError(input.videoId)`.
4. Leave the prompt-regeneration and status-derivation logic unchanged after the guard passes.

If you reduce duplication with the other guarded routes, keep it small and local. Do not widen this into a larger repository or routing refactor.

## Important Checks Before Editing

Please verify these points while implementing:

- `project.currentVideoBatchId` can be `null`; stale or orphaned regenerate requests should still be rejected cleanly
- the route contract should remain `videoId`, not logical `segmentId`
- the API behavior should stay aligned with `get`, `regenerate`, `approve`, `config`, `prompt`, and `reference-audios` segment routes
- the fix should not interfere with the separate approval-reset behavior already added to prompt regeneration

My current reading is:

- the right fix is to add the same current-batch guard used elsewhere
- the wrong fix is to let historical regeneration proceed but skip `projectRepository.updateStatus(...)`
- the wrong fix is also to change the route to a logical segment lookup

## Tests To Add Or Update

### Core use-case test

Primary file:

- `packages/core/tests/regenerate-video-prompt.test.ts`

Add a narrow case where:

- `project.currentVideoBatchId = "video_batch_current"`
- `findSegmentById(...)` returns a segment in `"video_batch_old"` for the same project

Assert that:

- the use case throws `SegmentVideoNotFoundError`
- `videoRepository.updateSegment(...)` is not called
- `videoRepository.listSegmentsByBatchId(...)` is not called
- `projectRepository.updateStatus(...)` is not called

Keep the existing current-batch happy path passing.

### API confidence test

Relevant file:

- `apps/api/tests/video-api.test.ts`

Recommended route-level case:

1. seed a project with a current approved video batch
2. seed an additional historical segment for the same project
3. call `POST /projects/:projectId/videos/segments/video_segment_old/regenerate-prompt`
4. expect `404`

If you add a project-detail assertion, use it only to confirm the current project's status was not changed by the rejected request.

## Acceptance Criteria

The task is done when all of the following are true:

- single-segment prompt regeneration rejects non-current-batch `videoId`s
- rejected stale-batch regenerate requests do not mutate segment records
- rejected stale-batch regenerate requests do not mutate project status
- current-batch regenerate behavior still works
- automated tests cover the stale-batch guard

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- regenerate-video-prompt
```

Recommended API confidence:

```powershell
corepack pnpm --filter @sweet-star/api test -- video-api
```

## Relevant Files

- `packages/core/src/use-cases/regenerate-video-prompt.ts`
- `packages/core/tests/regenerate-video-prompt.test.ts`
- `apps/api/tests/video-api.test.ts`
- `apps/api/src/http/register-video-routes.ts`
- `packages/core/src/use-cases/get-video.ts`
- `packages/core/src/use-cases/regenerate-video-segment.ts`
- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`
- `packages/core/src/ports/video-repository.ts`
- `packages/services/src/video-repository/sqlite-video-repository.ts`

## Non-Goals

Do not mix this task with:

- approval invalidation after prompt regeneration
- approval-readiness checks for missing video assets
- project status derivation while other segment videos are still generating
- broader historical video-batch access redesign
- changing route params from persisted `videoId` to logical segment identifiers
