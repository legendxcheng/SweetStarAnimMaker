# Video Prompt Editing Design

## Summary

Extend the `videos` stage so every segment exposes an editable video-model prompt, supports prompt regeneration at segment and batch scope, and adds top-level actions for regenerating all prompts and regenerating all segment videos.

The approved interaction model is:

- every `SegmentVideoRecord` stores a persisted editable prompt
- users may edit and save each segment prompt before video regeneration
- users may regenerate one segment prompt without auto-generating video
- users may regenerate all segment prompts without auto-generating video
- users may regenerate one segment video from the saved prompt
- users may regenerate all current-batch segment videos from saved prompts

This intentionally aligns the `videos` stage with the existing `images` prompt workflow rather than inventing a separate review model.

## Goals

- Show the current video prompt for every segment in Studio.
- Allow users to edit and save each segment prompt.
- Add a per-segment `重新生成当前段落提示词` action.
- Add top-level `重新生成所有段落提示词` and `重新生成所有视频段落` actions.
- Make video regeneration read the saved `promptTextCurrent`.
- Keep review and approval semantics unchanged.

## Non-Goals

- Do not redesign the batch or segment review layout beyond adding prompt controls.
- Do not auto-generate video when prompts are regenerated.
- Do not add project-level video batch recreation for the top-level regenerate-all-videos action.
- Do not add multi-candidate videos or version browsing in this pass.

## User-Facing Behavior

For each segment card in `VideoPhasePanel`:

- show a multiline prompt editor populated from `promptTextCurrent`
- show `保存提示词` when the local draft differs from the saved prompt
- show `重新生成当前段落提示词`
- keep `重新生成当前片段`
- keep `审核通过当前片段`

At the top of the panel:

- add `重新生成所有段落提示词`
- add `重新生成所有视频段落`
- keep `全部视频审核通过`

Behavior rules:

- saving a prompt updates only the prompt fields, not the video asset
- regenerating prompts updates prompt fields only
- regenerating videos uses saved prompts only
- any unsaved prompt draft disables segment video regeneration and batch video regeneration
- batch prompt regeneration syncs the UI back to server state

## Data Model

Extend `SegmentVideoRecord` with persisted prompt fields:

```ts
type SegmentVideoRecord = {
  id: string;
  projectId: string;
  batchId: string;
  sourceImageBatchId: string;
  sourceShotScriptId: string;
  segmentId: string;
  sceneId: string;
  order: number;
  status: "generating" | "in_review" | "approved" | "failed";
  promptTextSeed: string;
  promptTextCurrent: string;
  promptUpdatedAt: string;
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

Rules:

- `promptTextSeed` is the initial prompt generated when the segment video record is created
- `promptTextCurrent` is the saved editable prompt used by subsequent video generation
- `promptUpdatedAt` changes when prompts are initially created, regenerated, or manually saved
- video regeneration must not silently read stale task snapshots instead of `promptTextCurrent`

## API Contract

Add these routes:

- `PUT /projects/:projectId/videos/segments/:videoId/prompt`
- `POST /projects/:projectId/videos/segments/:videoId/regenerate-prompt`
- `POST /projects/:projectId/videos/regenerate-prompts`

Existing routes remain:

- `POST /projects/:projectId/videos/generate`
- `GET /projects/:projectId/videos`
- `GET /projects/:projectId/videos/segments/:videoId`
- `POST /projects/:projectId/videos/segments/:videoId/regenerate`
- `POST /projects/:projectId/videos/segments/:videoId/approve`
- `POST /projects/:projectId/videos/approve-all`

Request/response behavior:

- save prompt returns updated `SegmentVideoRecord`
- regenerate one prompt returns updated `SegmentVideoRecord`
- regenerate all prompts returns `VideoListResponse`
- regenerate one video still returns `TaskDetail`
- regenerate all videos is a Studio batch action implemented by sequentially calling the existing segment regenerate route for the current batch

The top-level regenerate-all-videos action is intentionally not a new backend endpoint in this pass.

## Backend Design

Shared contract changes:

- add prompt fields to `packages/shared/src/types/video.ts`
- extend `packages/shared/src/schemas/video-api.ts`
- add request schemas for save prompt and regenerate prompt routes

Core/domain changes:

- extend `SegmentVideoRecordEntity` creation and persistence to include prompt fields
- seed `promptTextSeed`, `promptTextCurrent`, and `promptUpdatedAt` during `process-videos-generate-task`
- add use cases for updating one video prompt, regenerating one video prompt, and regenerating all current-batch video prompts
- ensure segment video generation reads the persisted `promptTextCurrent`

Service/repository changes:

- add sqlite columns for the new prompt fields in `segment_videos`
- update sqlite repository row mapping and update statements

API changes:

- register new video prompt routes
- wire new services in API bootstrap

## Studio Design

`apps/studio/src/components/video-phase-panel.tsx` should follow the same draft pattern as `ImagePhasePanel`:

- maintain per-segment prompt drafts
- sync drafts from server unless the user has unsaved changes
- show save and regenerate-prompt actions per segment
- disable batch and segment video regeneration when any prompt draft is dirty

Top-level actions:

- `重新生成所有段落提示词` calls the new batch prompt-regeneration route
- `重新生成所有视频段落` sequentially calls segment video regeneration for each current-batch segment

This preserves the existing batch and approval UX while making prompts visible and controllable.

## Error Handling

- empty prompt drafts cannot be saved
- batch prompt regeneration disables all segment actions while running
- batch video regeneration stops on first failure and surfaces the error
- successful earlier segment regenerations are not faked as rolled back
- approval rules remain unchanged: only `in_review` segments may be approved individually

## Testing

Shared:

- schema tests for the new `SegmentVideoRecord` fields and request schemas

Core/services/API:

- sqlite repository tests for prompt field persistence
- save video prompt use case tests
- regenerate single video prompt use case tests
- regenerate all video prompts use case tests
- API route tests for the three new endpoints
- segment video generation tests proving saved `promptTextCurrent` is used

Studio:

- render prompt editor per segment
- dirty-state save behavior
- single-segment save prompt action
- single-segment regenerate prompt action
- top-level regenerate-all-prompts action
- top-level regenerate-all-videos action
- dirty-state button disabling

## Recommended Approach

Implement the full persisted prompt workflow for videos so the stage matches the already-established images-stage editing model.

This is preferable to:

- exposing non-persistent UI-only prompt edits
- adding partial prompt features without save semantics
- introducing a dedicated regenerate-all-videos backend route before it is needed
