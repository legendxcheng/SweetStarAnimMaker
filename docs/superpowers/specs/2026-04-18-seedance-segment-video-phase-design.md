# Seedance Segment Video Phase Design

## Goal

Replace the current Kling-oriented, shot-first video generation phase with a Seedance 2.0 oriented, segment-first workflow.

The new workflow must:

- treat one approved `shot_script segment` as one current video record
- generate Seedance-ready multimodal inputs centered on reference images and reference audios
- auto-assemble reference materials from existing approved image outputs
- allow operators to adjust prompt text, image references, and uploaded audio references before submitting generation
- preserve the existing project-level workflow shape: batch initialization, per-record generation, review, approval, and final cut

## Approved Product Decisions

The design for this work is explicitly based on the following approved decisions:

1. `Seedance 2.0` is the primary and only maintained video model for this phase.
2. The video phase becomes `segment-first`, not `shot-first`.
3. One `shot_script segment` maps to one current video record and one reviewable video asset.
4. First version supports `multimodal reference` mode with:
   - reference images
   - reference audios
   - no reference videos
5. The system auto-prepares reference materials, but operators can edit the generated result before video generation.
6. Reference audio comes from user file upload and replacement, not from automatic TTS generation.

## Current Problem

The existing codebase models video generation as a Kling-style workflow:

- one `shot` maps to one current video record
- the main provider contract assumes `startFramePath` and optional `endFramePath`
- prompt generation is optimized for one-shot Kling requests
- Studio UI presents one video card per shot

That model is structurally wrong for the intended Seedance workflow.

Seedance 2.0 multimodal generation for short drama clips is better aligned with:

- one continuous segment prompt covering multiple internal shots
- multiple reference images for continuity and staging
- optional audio references
- operator review of the composed input bundle before generation

Keeping the old shot-first shape and only swapping providers would preserve incorrect abstractions in the core domain model and make later changes harder.

## Target Workflow

The redesigned video phase should follow this flow:

`images_approved -> videos_generate -> segment video records created -> automatic reference assembly -> segment prompt generation -> videos_in_review -> operator edits prompt/images/audios -> segment_video_generate -> segment review -> videos_approved -> final_cut`

Important behavioral changes:

- `videos_generate` initializes the segment-first phase rather than directly producing all final videos.
- Each segment record stores its editable prompt and multimodal references as first-class data.
- Segment generation is triggered only from the current stored configuration.
- Review and approval stay incremental, but the unit changes from `shot` to `segment`.

## Domain Model

### Batch Summary

`CurrentVideoBatchSummary` should become segment-based:

- `segmentCount`
- `approvedSegmentCount`
- `updatedAt`

The batch summary should no longer expose `shotCount` as the primary review metric for the video phase.

### Segment Video Record

The main video record should become a real segment record instead of a shot record with legacy aliases.

Recommended shape:

```ts
type SegmentVideoReferenceImage = {
  id: string;
  assetPath: string;
  source: "auto" | "manual";
  order: number;
  sourceShotId?: string | null;
  label?: string | null;
};

type SegmentVideoReferenceAudio = {
  id: string;
  assetPath: string;
  source: "manual";
  order: number;
  label?: string | null;
  durationSec?: number | null;
};

type SegmentVideoRecord = {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  segmentOrder: number;
  segmentName: string | null;
  segmentSummary: string;
  shotCount: number;
  sourceShotIds: string[];
  status: "generating" | "in_review" | "approved" | "failed";
  promptTextSeed: string;
  promptTextCurrent: string;
  promptUpdatedAt: string;
  referenceImages: SegmentVideoReferenceImage[];
  referenceAudios: SegmentVideoReferenceAudio[];
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
};
```

Why the references belong in the record:

- operators can edit them
- generation tasks must be replayable
- the UI must render them directly
- the storage layer must persist them independently of transient task input

## Task Model

### Project-Level Task

`videos_generate` should:

- read the approved current shot script
- create one video batch
- create one `SegmentVideoRecord` per `ShotScriptSegment`
- auto-assemble reference images for each segment
- initialize empty `referenceAudios`
- enqueue or execute prompt generation for each segment

It should not create one video record per shot anymore.

### Prompt Generation Task

`segment_video_prompt_generate` should become segment-based and should receive:

- the target segment
- the list of shots inside that segment
- the auto-assembled image references
- the current uploaded audio references

Its output remains:

- `promptTextSeed`
- `promptTextCurrent`
- a prompt plan artifact

But the prompt semantics change from "single-shot Kling prompt" to "continuous Seedance segment prompt".

### Video Generation Task

`segment_video_generate` should read only the current persisted segment configuration:

- `promptTextCurrent`
- `referenceImages`
- `referenceAudios`

This avoids mismatches between what the UI shows and what the worker actually submits.

## Automatic Reference Assembly

Reference image assembly should be explicit core logic, not provider-internal behavior.

Recommended default algorithm:

1. Read all shots belonging to the segment.
2. Read the approved current image batch outputs for those shots.
3. Prefer each shot's approved `start_frame`.
4. Include an `end_frame` only when it provides additional useful visual coverage.
5. Remove duplicates by asset path.
6. Preserve deterministic ordering by `shot.order`, then by frame role.
7. Truncate to a Seedance-friendly maximum, recommended first-version cap: `6` images.
8. Add labels and `sourceShotId` values for UI clarity and later manual adjustment.

This logic should produce `referenceImages[]` with stable ordering and repeatable output.

Reference audio handling in version one:

- no auto-generated audio assets
- operators upload audio files per segment
- uploaded files become `referenceAudios[]`

## Prompt Semantics

The prompt provider must stop producing Kling-specific single-shot prompts and start producing Seedance short-drama segment prompts.

Prompt plans should reflect the approved operator workflow from `docs/guide/Seedance-ShortDrama-Video-Guide.md`, especially:

- clip positioning inside the larger edit
- continuity constraints
- opening carry-over state
- time-axis structure for internal sub-shots
- ending handoff state
- stylistic limits and no-extra-elements constraints

The prompt plan output may continue to include:

- `finalPrompt`
- `dialoguePlan`
- `audioPlan`
- `visualGuardrails`
- `rationale`

Optionally, it can add a `referenceSelectionRationale` field if useful for debugging or UI inspection.

## API Changes

The video API should become truly segment-first.

### Keep

- `POST /projects/:projectId/videos/generate`
- `GET /projects/:projectId/videos`
- `GET /projects/:projectId/videos/segments/:videoId`
- `POST /projects/:projectId/videos/segments/:videoId/approve`
- `POST /projects/:projectId/videos/approve-all`

### Replace / Add

- replace prompt-only save with:
  - `PUT /projects/:projectId/videos/segments/:videoId/config`
  - saves:
    - `promptTextCurrent`
    - `referenceImages`
    - `referenceAudios`
- replace regenerate route semantics with:
  - `POST /projects/:projectId/videos/segments/:videoId/generate`
  - creates a Seedance generation task from current stored config
- add audio asset upload routes:
  - `POST /projects/:projectId/videos/segments/:videoId/reference-audios`
  - `DELETE /projects/:projectId/videos/segments/:videoId/reference-audios/:audioId`

The config-save endpoint should be the primary mutation entrypoint because prompt text and multimodal references are one operator-edited configuration.

## Studio Changes

The current video workspace should preserve its overall place in the app, but each card becomes a segment card.

Each segment card should show:

- `sceneId`
- `segmentId`
- segment name or summary
- segment status
- shot count
- reference image list
- reference audio list
- editable prompt
- current video preview
- actions for:
  - regenerate prompt
  - save config
  - upload audio
  - generate current segment video
  - approve current segment

Button and label language must change from `镜头` / `shot` to `片段` / `segment`.

## Storage Changes

The video phase should standardize on segment directories.

Recommended structure:

```text
.local-data/projects/<project>/videos/
  current-batch.json
  batches/<batch-id>/
    manifest.json
    segments/<sceneId>__<segmentId>/
      current.mp4
      current.json
      thumbnail.webp
      prompt.plan.json
      references/
        images/
          <ref-id>.<ext>
        audios/
          <ref-id>.<ext>
      versions/
        <task-id>.mp4
        <task-id>.json
```

Important implications:

- reference assets become first-class persisted project assets
- uploaded audios live under the segment's own storage directory
- versioned outputs remain task-tagged for replay and audit

## Persistence Changes

The existing SQLite `segment_videos` table can stay, but the columns and repository semantics need to become segment-first.

Recommended changes:

- stop treating the row as a shot row
- add segment-level columns:
  - `segment_name`
  - `segment_summary`
  - `shot_count`
- add JSON text columns:
  - `source_shot_ids_json`
  - `reference_images_json`
  - `reference_audios_json`

It is acceptable for version one to leave obsolete columns in place:

- `shot_id`
- `shot_code`
- `shot_order`
- `frame_dependency`

New code should stop depending on those columns.

Using JSON columns for references is preferred in version one because:

- the references belong exclusively to one current segment video record
- the UI needs simple read/write access
- task replay benefits from keeping the record self-contained
- normalized relational tables would increase migration and write complexity without immediate benefit

## Provider Design

The provider abstraction should become Seedance-first rather than pretending to remain model-generic.

Recommended contract:

```ts
type GenerateSegmentVideoInput = {
  projectId: string;
  sceneId: string;
  segmentId: string;
  promptText: string;
  referenceImages: Array<{
    assetPath: string;
    label?: string | null;
    order: number;
  }>;
  referenceAudios: Array<{
    assetPath: string;
    label?: string | null;
    order: number;
  }>;
  durationSec: number | null;
  aspectRatio?: string | null;
};
```

The worker bootstrap should stop switching between Kling and Sora providers. Instead, it should build one Seedance provider using Seedance-specific environment variables.

Recommended environment variables:

- `SEEDANCE_API_BASE_URL`
- `SEEDANCE_API_KEY`
- `SEEDANCE_MODEL`
- `SEEDANCE_ASPECT_RATIO`
- `SEEDANCE_DURATION_SEC`

The provider implementation should handle:

- asset upload or conversion into API-ready references
- multimodal request assembly
- task submission
- polling
- final video result parsing

## Migration Strategy

Version one should use a forward-only runtime migration strategy:

- add new columns and read/write them
- leave old columns in place
- do not attempt to auto-convert historical shot-first video batches into new segment-first records
- allow the next `videos_generate` execution to create a fresh segment-first current batch

This avoids brittle historical data transformations with low product value.

## Testing Strategy

At minimum, the redesign needs tests in four areas.

### Shared and Schema Tests

- API schema reflects segment-first responses and config-save requests
- old shot-first assumptions are removed from public types

### Core Use Case Tests

- `create-videos-generate-task`
- `process-videos-generate-task`
- `process-segment-video-prompt-generate-task`
- `process-segment-video-generate-task`
- review and approve-all flows

These tests should verify:

- one segment creates one current video record
- image references are auto-assembled deterministically
- uploaded audio references persist correctly
- generation uses stored config rather than recomputed transient inputs

### Service Tests

- SQLite repository round-trips JSON reference fields
- storage layer persists reference audios and images into segment folders
- Seedance provider request body and polling behavior are correct

### Studio Tests

- segment card rendering
- prompt editing
- image reorder/delete behavior
- audio upload and delete flow
- generate and approve actions

### Final Cut Regression

Only one focused regression is required in version one:

- final cut concatenates approved segment videos in `segmentOrder`

## Risks And Mitigations

### Risk: Scope expansion from "provider swap" to workflow redesign

Mitigation:

- explicitly keep review and final cut product flow stable
- redesign only the video phase data model and inputs

### Risk: Auto-selected references may be noisy

Mitigation:

- make selection deterministic and conservative
- keep a low default image cap
- make the result operator-editable before generation

### Risk: Uploaded audio lifecycle introduces new storage complexity

Mitigation:

- scope audio support to upload/delete/order only
- do not add automatic audio derivation or transcoding in version one unless required by the provider

### Risk: Historical Kling data remains in the database

Mitigation:

- keep old columns as tolerated legacy fields
- isolate new logic to the current batch created after redesign

## File Areas Affected

The redesign is expected to touch at least:

- `packages/shared/src/types/video.ts`
- `packages/shared/src/schemas/video-api.ts`
- `packages/core/src/ports/video-provider.ts`
- `packages/core/src/domain/task.ts`
- `packages/core/src/domain/video.ts`
- `packages/core/src/use-cases/process-videos-generate-task.ts`
- `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- `packages/core/src/use-cases/update-video-prompt.ts` or its replacement
- `packages/services/src/video-repository/sqlite-video-schema.ts`
- `packages/services/src/video-repository/sqlite-video-repository.ts`
- `packages/services/src/storage/video-storage.ts`
- `packages/services/src/providers/gemini-video-prompt-provider.ts`
- `packages/services/src/providers/grok-video-prompt-provider.ts`
- new Seedance provider files under `packages/services/src/providers/`
- `apps/api/src/http/register-video-routes.ts`
- `apps/worker/src/bootstrap/video-provider-config.ts`
- `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- `apps/studio/src/components/video-phase-panel/video-shot-card.tsx` or its replacement

## Success Criteria

The redesign is successful when:

1. one approved `shot_script segment` creates one current video record
2. the UI shows operator-editable multimodal references for each segment
3. uploaded audio files persist as segment reference assets
4. video generation submits Seedance multimodal inputs rather than frame-only Kling inputs
5. review and approval operate at the segment level
6. final cut still works using approved segment videos
