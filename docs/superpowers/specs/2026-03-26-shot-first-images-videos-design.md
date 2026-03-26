# Shot-First Images And Videos Design

## Goal

Replace the current segment-first `images` and `videos` pipeline with a shot-first pipeline:

- `1 shot = 1 reference asset set`
- `frameDependency === start_frame_only` means the shot needs only a start frame
- `frameDependency === start_and_end_frame` means the shot needs both start and end frames
- `1 shot = 1 video clip`

The system must keep `shot_script` grouped by segment, but `images` and `videos` must treat `shot` as the generation, review, and progress-tracking atom.

## Why

The existing pipeline assumes:

- `1 segment = 1 pair of images`
- `1 segment = 1 video clip`

That no longer matches the actual model workflow:

- image generation is more controllable when handled one shot at a time
- video generation supports arbitrary integer durations between 3 and 15 seconds
- shot scripts already carry `frameDependency`, which explicitly states whether a shot needs one frame or two

Keeping segment-first semantics would force the UI, provider prompts, approval rules, and batch statistics to keep aggregating unrelated shots together.

## Current State

Current behavior:

- `shot_script` is `segment -> shots[]`
- `images` generates `start_frame` and `end_frame` per segment
- `videos` generates one video clip per segment
- Studio image review is organized around `SegmentFrameRecord`
- Studio video review is organized around `SegmentVideoRecord`

Relevant existing source of truth:

- `shot.frameDependency` already exists in shared types, schemas, providers, and Studio shot-script review

## Target Architecture

### Pipeline Boundaries

Keep:

- `shot_script`: `segment -> shots[]`

Replace:

- `images`: `segment-first` -> `shot-first`
- `videos`: `segment-first` -> `shot-first`

Resulting pipeline:

1. `storyboard -> shot_script`
2. `shot_script -> shot reference frames`
3. `approved shot reference frames -> shot video clips`

`segment` remains a grouping container for display and navigation, but it is no longer a generation or approval atom in the later phases.

### Reference Frame Rules

Each shot has one reference-frame asset set.

Rules:

- `start_frame_only`
  - required frames: `start_frame`
  - `end_frame` does not exist
- `start_and_end_frame`
  - required frames: `start_frame`, `end_frame`

The approval atom is the shot reference set, not an individual frame.

### Video Rules

Each shot has one video clip.

Rules:

- video duration comes from `shot.durationSec`
- video prompt generation is shot-scoped
- provider input depends on `frameDependency`
  - `start_frame_only`: start frame only
  - `start_and_end_frame`: both start and end frames

## Shared Data Model

### Images

Replace the current `SegmentFrameRecord` model with shot-scoped records.

```ts
type ImageFrameType = "start_frame" | "end_frame";

type ImageFramePlanStatus = "pending" | "planned" | "plan_failed";

type ImageFrameStatus =
  | "pending"
  | "generating"
  | "in_review"
  | "approved"
  | "failed";

type ShotReferenceStatus = "pending" | "in_review" | "approved" | "failed";

type ShotFrameDependency = "start_frame_only" | "start_and_end_frame";

interface ShotReferenceFrame {
  frameType: ImageFrameType;
  planStatus: ImageFramePlanStatus;
  imageStatus: ImageFrameStatus;
  selectedCharacterIds: string[];
  matchedReferenceImagePaths: string[];
  unmatchedCharacterIds: string[];
  promptTextSeed: string;
  promptTextCurrent: string;
  negativePromptTextCurrent: string | null;
  promptUpdatedAt: string | null;
  imageAssetPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  provider: string | null;
  model: string | null;
  approvedAt: string | null;
  updatedAt: string;
  sourceTaskId: string | null;
}

interface ShotReferenceRecord {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  sceneId: string;
  segmentId: string;
  shotId: string;
  shotCode: string;
  segmentOrder: number;
  shotOrder: number;
  durationSec: number | null;
  frameDependency: ShotFrameDependency;
  referenceStatus: ShotReferenceStatus;
  updatedAt: string;
  startFrame: ShotReferenceFrame;
  endFrame: ShotReferenceFrame | null;
}

interface CurrentImageBatch {
  id: string;
  sourceShotScriptId: string;
  shotCount: number;
  totalRequiredFrameCount: number;
  approvedShotCount: number;
  updatedAt: string;
}

interface ImageFrameListResponse {
  currentBatch: CurrentImageBatch;
  shots: ShotReferenceRecord[];
}
```

Key differences from the current model:

- `segmentCount` is no longer the primary summary metric
- `approvedFrameCount` is no longer the primary success metric
- the list response becomes shot-scoped instead of frame-scoped
- `endFrame` is nullable only for `start_frame_only`

### Videos

Replace `SegmentVideoRecord` with `ShotVideoRecord`.

```ts
type ShotVideoStatus = "pending" | "generating" | "in_review" | "approved" | "failed";

interface ShotVideoRecord {
  id: string;
  batchId: string;
  projectId: string;
  sourceShotScriptId: string;
  sourceImageBatchId: string;
  sourceShotReferenceId: string;
  sceneId: string;
  segmentId: string;
  shotId: string;
  shotCode: string;
  segmentOrder: number;
  shotOrder: number;
  frameDependency: ShotFrameDependency;
  durationSec: number | null;
  promptTextCurrent: string;
  status: ShotVideoStatus;
  videoAssetPath: string | null;
  thumbnailAssetPath: string | null;
  provider: string | null;
  model: string | null;
  approvedAt: string | null;
  updatedAt: string;
}

interface CurrentVideoBatch {
  id: string;
  sourceShotScriptId: string;
  sourceImageBatchId: string;
  shotCount: number;
  approvedShotCount: number;
  updatedAt: string;
}
```

## Domain And Storage Model

### Image Batch And Reference Storage

Replace segment-scoped image paths with shot-scoped paths.

Proposed layout:

```text
images/
  current-batch.json
  batches/
    <batch-id>/
      manifest.json
      shots/
        <sceneId>__<segmentId>__<shotId>/
          manifest.json
          start-frame/
            planning.json
            prompt.seed.txt
            prompt.current.txt
            current.png
            current.json
            prompt.versions/
            versions/
          end-frame/
            planning.json
            prompt.seed.txt
            prompt.current.txt
            current.png
            current.json
            prompt.versions/
            versions/
```

Rules:

- `end-frame/` exists only when `frameDependency === "start_and_end_frame"`
- each shot directory owns the complete reference set for that shot
- current batch manifest stores shot-based counts

### Video Storage

Replace segment-scoped video storage with shot-scoped storage.

Proposed layout:

```text
videos/
  current-batch.json
  batches/
    <batch-id>/
      manifest.json
      shots/
        <sceneId>__<segmentId>__<shotId>/
          manifest.json
          prompt.current.txt
          current.mp4
          current.json
          thumbnail.png
          versions/
```

## Image Generation Flow

### Project-Level Task

`images_generate` becomes a shot-initialization task.

Responsibilities:

1. read the approved current shot script
2. create one image batch
3. create one `ShotReferenceRecord` per shot
4. initialize required frame slots based on `frameDependency`
5. enqueue prompt/image tasks for required frame slots

### Frame-Level Tasks

Prompt and image generation remain frame-granular because prompt editing and image generation are inherently frame-specific.

Responsibilities of a frame task:

1. locate the owning `ShotReferenceRecord`
2. update only the addressed frame slot
3. recompute the parent `referenceStatus`
4. persist the updated shot record

This keeps operational granularity at the frame level without exposing frame-level approval semantics.

### Approval

Replace `approve image frame` with `approve shot reference`.

Approval rules:

- `start_frame_only`
  - requires `startFrame.imageStatus === "in_review"`
  - approving the shot marks `startFrame` and the shot as approved
- `start_and_end_frame`
  - requires both `startFrame.imageStatus === "in_review"` and `endFrame.imageStatus === "in_review"`
  - approving the shot marks both required frames and the shot as approved

There is no longer a UI or API concept of approving just one frame while leaving the shot partially approved.

### Batch-Level Actions

Keep the existing convenience actions, but make them shot-aware:

- regenerate all prompts
- regenerate all images
- approve all shot reference sets

Batch summaries and eligibility checks must be computed using shots, not segments.

## Video Generation Flow

### Project-Level Task

`videos_generate` becomes a shot-video initialization task.

Responsibilities:

1. read the current approved image batch
2. validate that all required shots for generation have approved reference sets
3. create one `ShotVideoRecord` per approved shot reference set
4. generate or enqueue one video job per shot

### Video Prompt Generation

Video prompt generation becomes shot-scoped.

Prompt variables must include:

- shot metadata
- `frameDependency`
- approved start frame path
- approved end frame path when required
- shot duration
- shot continuity and transition notes
- segment summary as contextual grouping only

### Video Provider Input

Providers must be called according to `frameDependency`:

- `start_frame_only`
  - pass only the approved start frame
- `start_and_end_frame`
  - pass approved start and end frames

No provider should be forced through a fake segment-level interface once the system is shot-first.

### Approval

Replace segment-level video approval with shot-level video approval:

- approve current shot clip
- approve all shot clips

Batch summaries become shot-based.

## Studio UI Changes

### Image Phase Panel

`ImagePhasePanel` remains grouped by scene and segment for navigation, but each segment renders shot cards.

New structure:

1. batch summary
   - shot count
   - total required frame count
   - approved shot count
   - updated at
2. scene tabs
3. segment containers
4. shot cards inside each segment

Each shot card shows:

- `shotCode`
- `shot.order`
- `durationSec`
- `frameDependency`
- `referenceStatus`
- shot text metadata (`purpose`, `visual`, `subject`, `action`, `continuityNotes`)
- one or two frame editors depending on `frameDependency`

Suggested component split:

- `ImagePhasePanel`
- `ShotReferenceCard`
- `FrameEditorCard`

`FrameEditorCard` keeps frame-specific editing and preview behavior.
`ShotReferenceCard` owns shot-level status and actions.

UI actions:

- frame-level
  - save prompt
  - regenerate prompt
  - generate image
- shot-level
  - approve current shot reference set
  - regenerate current shot prompts
  - regenerate current shot images
- batch-level
  - regenerate all shot prompts
  - regenerate all shot images
  - approve all shot references

Remove:

- approve current frame

That action would leak frame-first semantics back into the user experience.

### Video Phase Panel

`VideoPhasePanel` becomes shot-based.

Each card shows:

- `shotCode`
- `sceneId / segmentId / shotId`
- `durationSec`
- `frameDependency`
- prompt editor
- provider/model metadata
- current clip preview

Text and actions must refer to "镜头片段" or equivalent shot-level wording, not segment-level wording.

## Error Handling And Aggregation Rules

### Shot Reference Status Aggregation

For each shot:

- if any required frame slot is `failed`, `referenceStatus = failed`
- if all required frame slots are `approved`, `referenceStatus = approved`
- if all required frame slots are at least `in_review`, `referenceStatus = in_review`
- otherwise `referenceStatus = pending`

`endFrame` is excluded from all checks when `frameDependency === "start_frame_only"`.

### Duration Validation

`videos` must treat `shot.durationSec` as required operational input.

Rules:

- if `durationSec` is `null`, that shot cannot generate a video
- Studio must display a clear blocking reason
- batch generation may skip invalid shots, but the API must report skipped counts explicitly

The system must not fall back to segment duration after this redesign.

### Batch Action Results

Batch action responses should report:

- triggered count
- skipped count
- failed count

This avoids silent partial execution.

## Migration Strategy

Use a clean one-time schema migration instead of a long-lived compatibility layer.

Approach:

- retire `SegmentFrameRecord`
- retire `SegmentVideoRecord`
- replace image and video repositories with shot-based schemas and DTOs
- rebuild current batches through regeneration instead of trying to preserve old segment-first runtime semantics

Rationale:

- the system is still evolving rapidly
- this is a semantic redesign, not a cosmetic rename
- dual segment-first and shot-first support would leak complexity across shared, core, services, and Studio

Out of scope for this migration:

- preserving old in-progress image/video batches for seamless continued review
- long-lived adapters for segment-first APIs

## Testing Strategy

### Shared

Update tests for:

- shot image schemas and types
- shot video schemas and types
- batch summary fields using shot-based counts

### Core

Add or update tests for:

- `images_generate` creates one shot record per shot
- `start_frame_only` shots create only a start frame slot
- `start_and_end_frame` shots create both slots
- shot reference approval aggregates required frame slots correctly
- batch approval uses shot readiness, not frame count
- `videos_generate` creates one video record per shot
- video generation consumes `durationSec` and `frameDependency`
- invalid `durationSec` blocks shot video generation

### Services

Update tests for:

- repository schema and mapping changes
- shot-based storage paths
- prompt snapshot generation from shot-scoped inputs
- provider requests with one-frame and two-frame inputs

### Studio

Update tests for:

- image panel renders shot cards inside segment groups
- `start_frame_only` renders only the start-frame editor
- shot approval button state depends on all required frames
- video panel renders one card per shot
- batch summary labels and counts use shot-based terminology

## Files Likely Affected

Shared and schemas:

- `packages/shared/src/types/shot-image.ts`
- `packages/shared/src/schemas/image-api.ts`
- `packages/shared/src/types/video.ts`
- `packages/shared/src/schemas/video-api.ts`
- related shared exports and tests

Core image flow:

- `packages/core/src/domain/shot-image.ts`
- image use cases under `packages/core/src/use-cases/`
- task payload definitions in `packages/core/src/domain/task.ts`

Core video flow:

- `packages/core/src/domain/video.ts`
- video use cases under `packages/core/src/use-cases/`

Services and persistence:

- shot image repository/storage files
- video repository/storage files
- provider prompt builders that still assume segment-scoped inputs

Studio:

- `apps/studio/src/components/image-phase-panel.tsx`
- `apps/studio/src/components/image-phase-panel/frame-editor-card.tsx`
- `apps/studio/src/components/image-phase-panel/types.ts`
- `apps/studio/src/components/image-phase-panel/utils.ts`
- `apps/studio/src/components/video-phase-panel.tsx`
- related integration tests

Docs:

- workflow docs for `05-Shot-Script-To-Images-Guide.md`
- workflow docs for `06-Images-To-Videos-Guide.md`

## Decisions

Approved decisions:

1. use a full shot-first redesign, not a compatibility wrapper
2. use existing `shot.frameDependency` as the source of truth for required frames
3. make shot reference approval atomic at the shot level
4. make video generation and review shot-scoped
5. use one-time migration semantics instead of long-lived dual support

