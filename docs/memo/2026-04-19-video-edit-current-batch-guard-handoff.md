# Hand-off: Restrict Segment Video Edit Routes To The Current Batch

## Scope

This memo is only for review finding #2:

- segment video edit routes can mutate project status using a segment from an older video batch
- do not broaden this task into approval invalidation, prompt-regeneration semantics, or other video-phase review findings unless the fix directly depends on them

Current workspace context:

- Repo: `E:\SweetStarAnimMaker`
- Branch: `main`
- Reviewed against commit range `6475220..2ccce95`
- The current workspace also has local, uncommitted edits related to other video review findings in:
  - `packages/core/src/use-cases/process-segment-video-generate-task.ts`
  - `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
  - `packages/core/src/use-cases/save-segment-video-config.ts`
  - `packages/core/src/use-cases/update-video-prompt.ts`
  - `packages/core/src/use-cases/upload-segment-video-audio.ts`
  - `packages/core/src/use-cases/derive-project-video-status.ts`
  - related test and UI files under `apps/api/tests` and `apps/studio/tests`

Avoid overwriting unrelated local edits while addressing this finding.

## Problem Summary

Three segment video mutation paths currently accept `videoId`, load the segment by raw record id, and only verify project ownership:

- `PUT /projects/:projectId/videos/segments/:videoId/config`
- `PUT /projects/:projectId/videos/segments/:videoId/prompt`
- `POST /projects/:projectId/videos/segments/:videoId/reference-audios`

In the corresponding use cases, the code then:

1. updates that segment record
2. loads all segments from `segment.batchId`
3. re-derives and overwrites the project status from that batch

If `videoId` belongs to a historical batch instead of the current one, the request can still succeed and incorrectly rewrite the current project's lifecycle status based on old data.

Practical fallout:

- the current project can regress to the wrong status
- `currentVideoBatch.approvedSegmentCount` can stop matching the real active batch
- final-cut gating and video-phase UI state become disconnected from the actual current batch
- old batch records gain write effects on the current project state

This is a current-batch authorization/targeting bug, not primarily a status-derivation bug.

## Why This Happens

### The edit use cases do not enforce `project.currentVideoBatchId`

In these files:

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`

the current logic checks:

- project exists
- segment exists
- `segment.projectId === project.id`

but does not check:

- `segment.batchId === project.currentVideoBatchId`

After that, each use case re-derives project state from `segment.batchId`, which is only safe if the segment is guaranteed to be in the current batch.

### Other segment-video routes already behave as current-batch-only

There is already clear precedent that `/videos/segments/:videoId/...` routes are supposed to operate on the active batch only.

Reference implementations:

- `packages/core/src/use-cases/get-video.ts`
- `packages/core/src/use-cases/regenerate-video-segment.ts`
- `packages/core/src/use-cases/approve-video-segment.ts`

Those paths reject the request when:

- the segment belongs to a different project, or
- the segment's `batchId` does not equal `project.currentVideoBatchId`

So the edit routes are currently the outliers.

### Route identity is the persisted video record id, not the logical segment id

Do not confuse this issue with the repository methods that query by logical segment ids. The route param is `videoId`, and there are already cases where logical segment ids repeat across scenes.

That means the safest narrow fix is:

- keep loading by `findSegmentById(videoId)`
- add current-batch validation after load

Do not switch these routes to `findCurrentSegmentByProjectIdAndSegmentId(...)`; that uses a different identifier and can target the wrong record shape.

## Expected Behavior

For the three mutation routes listed above:

1. They should only operate on the project's current video batch.
2. If the referenced `videoId` belongs to an older batch, the request should fail as not found for this route.
3. No segment mutation should occur for historical batch records.
4. No project status update should occur for historical batch records.
5. Existing behavior for the current batch should remain intact.

The narrow behavior target is:

- current batch segment: allowed
- stale batch segment: rejected

## Recommended Implementation

Primary files:

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`

Recommended approach:

1. Keep the initial `findSegmentById(input.videoId)` lookup.
2. After loading `project` and `segment`, require:
   - `segment.projectId === project.id`
   - `segment.batchId === project.currentVideoBatchId`
3. If either check fails, throw `SegmentVideoNotFoundError(input.videoId)`.
4. Leave the rest of the mutation logic as-is.
5. Keep project status re-derivation, because it is valid once the current-batch guard is in place.

If you want to reduce duplication, a tiny local helper is acceptable, but do not widen this into a large refactor unless it materially improves correctness.

## Important Checks Before Editing

Please verify these points while implementing:

- `project.currentVideoBatchId` can be `null`; stale or orphaned edits should still be rejected cleanly
- the API behavior should stay aligned with existing `get`, `regenerate`, and `approve` segment routes
- the route contract should remain `videoId`, not logical `segmentId`
- the fix should not break duplicated logical segment ids across scenes or batches

My current reading is:

- the right fix is to guard these edit flows to the current batch
- the wrong fix is to let historical edits proceed but skip `projectRepository.updateStatus(...)`
- the wrong fix is also to replace `videoId` handling with a logical-segment lookup API

## Tests To Add Or Update

### Core use-case tests

Primary files:

- `packages/core/tests/save-segment-video-config.test.ts`
- `packages/core/tests/update-video-prompt.test.ts`
- `packages/core/tests/upload-segment-video-audio.test.ts`

Add narrow cases where:

- `project.currentVideoBatchId = "video_batch_current"`
- `findSegmentById(...)` returns a segment in `"video_batch_old"` for the same project

Assert that:

- the use case throws `SegmentVideoNotFoundError`
- `videoRepository.updateSegment(...)` is not called
- `projectRepository.updateStatus(...)` is not called

Keep the existing current-batch happy-path tests passing.

### API confidence test

Relevant file:

- `apps/api/tests/video-api.test.ts`

Recommended route-level case:

1. seed a project with a current video batch
2. seed an additional historical batch segment for the same project
3. call one of the mutation routes against the old segment id
4. expect a `404`

You can keep this narrow. One route-level test may be enough if the core use-case coverage handles the three paths individually.

If you add a project-detail assertion, use it only to confirm the current project status was not changed by the rejected request.

## Acceptance Criteria

The task is done when all of the following are true:

- segment config save rejects non-current-batch `videoId`s
- legacy prompt save rejects non-current-batch `videoId`s
- reference audio upload rejects non-current-batch `videoId`s
- rejected stale-batch edits do not mutate segment records
- rejected stale-batch edits do not mutate project status
- current-batch edit behavior still works
- automated tests cover the stale-batch guard

## Suggested Verification Commands

Run at minimum:

```powershell
corepack pnpm --filter @sweet-star/core test -- save-segment-video-config
```

```powershell
corepack pnpm --filter @sweet-star/core test -- update-video-prompt
```

```powershell
corepack pnpm --filter @sweet-star/core test -- upload-segment-video-audio
```

Recommended API confidence:

```powershell
corepack pnpm --filter @sweet-star/api test -- video-api
```

## Relevant Files

- `packages/core/src/use-cases/save-segment-video-config.ts`
- `packages/core/src/use-cases/update-video-prompt.ts`
- `packages/core/src/use-cases/upload-segment-video-audio.ts`
- `packages/core/src/use-cases/get-video.ts`
- `packages/core/src/use-cases/regenerate-video-segment.ts`
- `packages/core/src/use-cases/approve-video-segment.ts`
- `packages/core/tests/save-segment-video-config.test.ts`
- `packages/core/tests/update-video-prompt.test.ts`
- `packages/core/tests/upload-segment-video-audio.test.ts`
- `apps/api/tests/video-api.test.ts`
- `apps/api/src/http/register-video-routes.ts`
- `packages/core/src/ports/video-repository.ts`
- `packages/services/src/video-repository/sqlite-video-repository.ts`

## Non-Goals

Do not mix this task with:

- approval invalidation after config/audio/prompt edits
- prompt-regeneration status semantics
- video-generation success/failure status derivation
- redesigning historical video-batch access
- changing route params from persisted `videoId` to logical segment identifiers
