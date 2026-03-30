# Final Cut Export Design

**Goal**

Add a project-level final cut export that concatenates all approved shot videos into one MP4, lets the user trigger generation manually, then plays and downloads the resulting file in Studio.

**Scope**

- Add a project-level final cut resource and generation task.
- Concatenate current shot videos from the current video batch in fixed `scene -> segment -> shot` order.
- Gate generation so it only runs when every shot in the current batch is `approved`.
- Surface final cut status and asset playback/download in the Studio video phase.

**Non-Goals**

- No timeline editing or manual reorder.
- No transitions, subtitles, background music, trimming, or audio mixing.
- No automatic generation after shot completion.
- No support for exporting from non-current video batches.

**Trigger And Gate**

- Users trigger final cut generation manually from Studio.
- The backend rejects generation unless:
  - the project has a current video batch
  - the batch contains at least one shot video
  - every shot video in that batch is `approved`
  - every shot video has a readable `current.mp4`

**Ordering**

- Final cut input order is fixed and deterministic.
- Sort all shot videos by:
  1. `sceneId`
  2. `segmentOrder`
  3. `shotOrder`
- Studio does not provide any reorder controls.

**Architecture**

Introduce a dedicated `final_cut_generate` task instead of assembling the MP4 inside a read route. This keeps long-running ffmpeg work inside the existing task and worker model, preserves retryability, and leaves room for future export variants without changing the video-segment pipeline.

The final cut uses the current video batch as its source of truth. Worker execution resolves the current batch, validates the approved-shot gate, collects stable `current.mp4` asset paths, writes an ffmpeg concat manifest, invokes local ffmpeg, and stores a stable `current.mp4` plus versioned artifacts under a project-level `final-cut/` directory.

**Domain Model**

Add a project-level final cut record with:

- `id`
- `projectId`
- `projectStorageDir`
- `sourceVideoBatchId`
- `status`: `generating | ready | failed`
- `videoAssetPath`
- `manifestAssetPath`
- `shotCount`
- `updatedAt`
- `createdAt`
- `errorMessage`

The project keeps a pointer to the current final cut record so Studio can read one stable resource.

**Storage Contract**

```text
.local-data/projects/<project>/
  final-cut/
    current.json
    current.mp4
    manifests/
      <finalCutId>.txt
    versions/
      <finalCutId>.json
      <finalCutId>.mp4
```

Rules:

- `current.mp4` is the stable playback and download target for Studio.
- `current.json` mirrors the latest successful or failed export state.
- `versions/<finalCutId>.mp4` preserves each generated export.
- `manifests/<finalCutId>.txt` stores the concat input list used by ffmpeg.

**Task Flow**

1. `POST /projects/:projectId/final-cut/generate` creates a `final_cut_generate` task.
2. Worker loads the project and current video batch.
3. Worker validates the approved-shot gate and source asset existence.
4. Worker sorts shot videos in fixed order and writes the concat manifest.
5. Worker runs ffmpeg concat to generate one MP4.
6. Worker writes stable and versioned final cut assets.
7. Worker upserts the current final cut record and marks the task succeeded.
8. On failure, worker records the error on the final cut record and task log.

**API Contract**

Add:

- `POST /projects/:projectId/final-cut/generate`
- `GET /projects/:projectId/final-cut`

`GET` response should include:

- current final cut metadata
- source batch id
- status
- video asset path when available
- shot count
- updated time
- failure message when failed

If no final cut exists yet, return a typed empty response instead of a 404 so Studio can render an empty state without special-case error handling.

**Studio UX**

Keep final cut inside the existing video phase panel.

Required behavior:

- Show a `生成成片` button.
- Disable the button until all current batch shots are approved.
- When disabled, show concise helper text explaining the gate.
- While generation is running, show a loading state for the final cut area.
- When ready, render a video player for the final cut MP4.
- Show a `下载 MP4` button pointing at the final cut asset.
- If generation failed, show the failure message and allow retry by clicking `生成成片` again.

**Validation And Error Handling**

- If no current video batch exists, reject generation with a video-stage domain error.
- If any shot is not approved, reject generation with a gate error.
- If any source MP4 is missing, fail the task with the missing shot id or path in the log.
- If ffmpeg is unavailable or exits non-zero, fail the task and persist the stderr summary.

**Testing**

Add tests for:

- use case gate rejection when not all shots are approved
- deterministic source ordering for concat manifest creation
- worker success path writing current and versioned assets
- API create/read routes
- Studio integration for button gating, loading state, playback, and download button

**Open Implementation Choice**

Assume ffmpeg is installed and available on PATH for this first pass. If runtime environments later vary, add explicit ffmpeg-path configuration in the service bootstrap instead of complicating the initial export flow.
