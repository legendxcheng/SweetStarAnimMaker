# Segment-First Shot Script To Images Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** `apps/api`, `apps/worker`, `apps/studio`, `packages/core`, `packages/services`, `packages/shared`

---

## Summary

Redesign the `shot_script -> images` pipeline around `storyboard.segment` as the execution unit.

This spec supersedes the old assumptions in `2026-03-22-shot-script-backend-design.md`:

- `1 storyboard segment = 1 shot_script item`
- `1 shot = 1 image`
- one whole-project `shot_script` generation request

The new contract is:

- `storyboard` remains the narrative source of truth
- `1 segment -> N shots`
- `shot_script` is generated with one AI request per segment
- `images` becomes `1 segment -> 2 images`
- the two images are `start_frame` and `end_frame`
- future video generation is also `1 segment -> 1 video request`

## Problem Statement

The current `shot_script` stage is semantically wrong for the intended workflow.

- A storyboard already contains scenes and segments.
- A segment is a playable dramatic unit and may require multiple internal shots.
- Flattening one segment into exactly one shot loses pacing, blocking, reaction beats, and visual continuity.
- Generating the whole project's shot script in one model request is too brittle and weakens controllability, validation, and review.
- The current images design duplicates shot-level prompt work instead of aligning with the actual downstream video constraint.

The target workflow must match the short-drama prompt guide in `docs/guide/单集短剧提示词.md`: one segment can contain multiple shots, but each shot must stay visually concrete and executable.

## Approved Pipeline Semantics

Pipeline order:

1. `premise`
2. `master_plot`
3. `character_sheets`
4. `storyboard`
5. `shot_script`
6. `images`
7. `final_cut`

Semantic contract:

- `storyboard.scene[]` is editorial grouping only
- `storyboard.segment[]` is the operational unit for shot-script generation, review, images, and future video
- `shot_script` expands each segment into multiple internal shots
- `images` does not generate per-shot stills; it generates segment-level boundary frames
- future `video` generation will consume one segment's shots plus that segment's start/end frames

Duration rules:

- every `storyboard.segment.durationSec` must be `<= 15`
- shot-script generation may choose shot count freely per segment
- the sum of `segment.shots[].durationSec` should closely match `segment.durationSec`
- validation should reject obviously invalid outputs such as zero shots, negative durations, or large duration drift

Language rules:

- `shot_script` output must be Simplified Chinese
- field values intended for user review must also be Chinese
- provider prompts, examples, and validation should optimize for Chinese cinematic output rather than English screenplay text

## Shot Script Data Model

Replace the flat project-wide `shots[]` contract with a segment-grouped artifact:

```ts
type CurrentShotScript = {
  id: string;
  title: string | null;
  sourceStoryboardId: string;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
  segmentCount: number;
  shotCount: number;
  totalDurationSec: number | null;
  segments: ShotScriptSegment[];
};

type ShotScriptSegment = {
  segmentId: string;
  sceneId: string;
  order: number;
  name: string | null;
  summary: string;
  durationSec: number | null;
  status: "pending" | "generating" | "in_review" | "approved";
  lastGeneratedAt: string | null;
  approvedAt: string | null;
  shots: ShotScriptItem[];
};

type ShotScriptItem = {
  id: string;
  segmentId: string;
  sceneId: string;
  order: number;
  shotCode: string;
  durationSec: number | null;
  purpose: string;
  visual: string;
  subject: string;
  action: string;
  dialogue: string | null;
  os: string | null;
  audio: string | null;
  transitionHint: string | null;
  continuityNotes: string | null;
};
```

Rules:

- `CurrentShotScript.segments[]` keeps the same order as storyboard segments
- each `ShotScriptSegment` maps to exactly one storyboard segment
- each segment contains `N >= 1` shots
- `ShotScriptItem` fields must remain concrete, visible, and reviewable
- no image prompt fields are stored on `shot_script` in this pass

## Shot Script Task Model

Use orchestration plus per-segment generation:

```ts
type TaskType =
  | "shot_script_generate"
  | "shot_script_segment_generate";
```

Batch task input:

```ts
type ShotScriptGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "shot_script_generate";
  sourceStoryboardId: string;
  storyboard: CurrentStoryboard;
  sourceMasterPlotId?: string;
  masterPlot?: CurrentMasterPlot;
  sourceCharacterSheetBatchId?: string;
  characterSheets?: CharacterSheetSnapshot[];
  promptTemplateKey: "shot_script.segment.generate";
};
```

Per-segment task input:

```ts
type ShotScriptSegmentGenerateTaskInput = {
  taskId: string;
  projectId: string;
  taskType: "shot_script_segment_generate";
  sourceStoryboardId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  segment: CurrentStoryboard["segments"][number];
  storyboardTitle?: string | null;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: CharacterSheetSnapshot[];
  promptTemplateKey: "shot_script.segment.generate";
};
```

Rules:

- `shot_script_generate` creates the grouped draft shell and enqueues one `shot_script_segment_generate` task per segment
- `shot_script_segment_generate` updates only one segment's `shots[]`
- regenerate from review also reuses `shot_script_segment_generate`
- this design keeps the model request bounded to one segment's context

## Shot Script Review Model

Review is segment-level, not whole-document-only.

Required actions:

- approve one segment
- regenerate one segment
- save manual edits for one segment
- approve all segments

Behavior:

- project enters `shot_script_generating` when batch generation starts
- a segment enters `in_review` when its generation succeeds
- a segment enters `approved` only after explicit approval
- project enters `shot_script_in_review` when at least one segment is reviewable
- project enters `shot_script_approved` only when every segment is approved

Manual editing rules:

- edits are scoped to one segment's `shots[]`
- manual save does not auto-approve
- manual save creates a human version history entry
- segment review actions must not overwrite other segments

## Prompting And Validation Rules

Add a new template:

- `shot_script.segment.generate`

Prompt requirements:

- provide only the necessary episode, scene, segment, and character context
- explicitly ask for Simplified Chinese output
- instruct the model that one segment may contain multiple shots
- instruct the model that the segment total duration must stay within the provided segment duration
- follow the style in `docs/guide/单集短剧提示词.md`
- require visible, concrete, executable shot descriptions

Validation requirements:

- segment id and scene id must match the source segment
- output must contain at least one shot
- output must be Chinese-first and reject clearly English screenplay output
- each shot duration must be positive when present
- summed duration should be within a small tolerance of segment duration
- shot order and shot code must be deterministic after normalization

## Images Data Model

Redesign the image stage around segments instead of individual shots.

```ts
type CurrentImageBatchSummary = {
  id: string;
  sourceShotScriptId: string;
  segmentCount: number;
  approvedSegmentCount: number;
  updatedAt: string;
};

type SegmentFrameImageRecord = {
  id: string;
  projectId: string;
  batchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  frameType: "start_frame" | "end_frame";
  status: "generating" | "in_review" | "approved" | "failed";
  imageAssetPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
};
```

Rules:

- every segment produces exactly two current image records
- images are operationally grouped by segment
- this pass does not add standalone stored text artifacts named `startFramePrompt` or `endFramePrompt`
- prompt derivation may happen inside task processing only

## Images Task Model

Use segment orchestration:

```ts
type TaskType =
  | "images_generate"
  | "segment_frames_generate";
```

Batch task:

- reads current approved `shot_script`
- creates one segment-frame pair per segment
- enqueues one `segment_frames_generate` task per segment

Per-segment task:

- consumes that segment's `shots[]`
- generates two images: `start_frame` and `end_frame`
- updates only that segment's frame records

Review model:

- approve per segment
- regenerate per segment
- optional approve-all action for all segments currently reviewable
- project reaches `images_approved` only when every segment's two current frames are approved

## Storage Contract

`shot_script` storage stays versioned, but grouped by segment content:

```text
.local-data/projects/<project>/
  shot-script/
    current.json
    current.md
    versions/
      v1-ai.json
      v1-ai.md
      v2-human.json
      v2-human.md
```

`images` storage becomes segment-frame oriented:

```text
.local-data/projects/<project>/
  images/
    current-batch.json
    batches/
      <batchId>/
        manifest.json
        segments/
          <segmentId>/
            start-frame/
              current.png
              current.json
              versions/
            end-frame/
              current.png
              current.json
              versions/
```

Task artifacts still persist:

- `input.json`
- `output.json`
- `prompt-snapshot.json`
- `raw-response.txt`
- `log.txt`

## API Contract

Shot-script routes:

- `POST /projects/:projectId/shot-script/generate`
- `GET /projects/:projectId/shot-script/current`
- `GET /projects/:projectId/shot-script/review`
- `PUT /projects/:projectId/shot-script/segments/:segmentId`
- `POST /projects/:projectId/shot-script/segments/:segmentId/regenerate`
- `POST /projects/:projectId/shot-script/segments/:segmentId/approve`
- `POST /projects/:projectId/shot-script/approve-all`

Images routes:

- `POST /projects/:projectId/images/generate`
- `GET /projects/:projectId/images`
- `GET /projects/:projectId/images/segments/:segmentId`
- `POST /projects/:projectId/images/segments/:segmentId/regenerate`
- `POST /projects/:projectId/images/segments/:segmentId/approve`
- `POST /projects/:projectId/images/approve-all`

Project detail DTO should expose enough summary data for:

- `currentShotScript.segmentCount`
- `currentShotScript.shotCount`
- per-segment review progress
- `currentImageBatch.segmentCount`
- `currentImageBatch.approvedSegmentCount`

## Studio Implications

`storyboard` panel:

- keep showing scene and segment structure as the upstream truth

`shot_script` panel:

- render one review card per segment
- each card shows that segment's multiple shots
- actions are per segment: edit, regenerate, approve
- provide a top-level `全部通过` action

`images` panel:

- render one review card per segment
- each card shows exactly two images: start frame and end frame
- actions are per segment: regenerate, approve
- provide a top-level `全部通过` action

The UI should avoid duplicating storyboard text. The shot-script view should focus on the new multi-shot expansion inside each segment.

## Migration And Compatibility

- old flat `shot_script.shots[]` data is no longer the target contract
- old image design based on `shotId` is superseded by segment-frame records
- existing incomplete work on the non-green baseline may be adapted in place; backward compatibility for unfinished local data is not required
- if a project has an approved storyboard, it may regenerate `shot_script` under the new contract
- if a project has an old `shot_script`, it should be considered stale for the new images stage

## Out Of Scope

- storing explicit standalone prompt text artifacts for start/end frames
- future video generation implementation
- timeline editing
- multiple candidate frames per segment
- automatic segmentation changes inside storyboard
- refactoring all phases into one generic asset engine
