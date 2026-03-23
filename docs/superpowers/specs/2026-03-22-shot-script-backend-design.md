# Shot Script Backend Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Scope:** `shared/core/services/api/worker` shot-script generation, storage, review, and project-status integration

---

## Summary

Implement `shot_script` as the formal project phase after `storyboard`. This phase converts an approved storyboard into a stable, reviewable, replayable `shot_script` asset that downstream `image` generation can consume directly.

This implementation pass focuses on the backend workflow only. It should add the complete generation and review chain, including task creation, task processing, persistent storage, review actions, and project-status transitions. Studio-specific editing and navigation can integrate against these contracts later.

---

## Design Decisions

### Phase Strategy

- Treat `shot_script` as an independent project phase, not as a field or sub-mode inside `storyboard`.
- Reuse the existing architectural pattern already established for `master_plot` and `storyboard`.
- Do not introduce a new generic "text asset" abstraction in this task.
- Keep `shot_script` naming explicit across task types, project statuses, storage paths, schemas, and use cases.

### Phase Gate

- Only projects in `storyboard_approved` may create a `shot_script_generate` task.
- A successful `shot_script_generate` task moves the project to `shot_script_in_review`.
- Approving the current shot script moves the project to `shot_script_approved`.
- Future downstream phases should treat `shot_script_approved` as the formal prerequisite, but implementing the `image` phase itself is out of scope here.

### Mapping Rule

- Lock the current generation rule to `one storyboard segment = one shot_script item`.
- Do not split one segment into multiple shots in this phase.
- Do not merge multiple segments into one shot in this phase.

### Review Model

- Review behavior should mirror the existing storyboard workflow.
- `save` creates a new human version and updates `current`, but does not auto-approve.
- `approve` marks the current shot script approved and advances project status.
- `reject` requires `reason` and `nextAction`.
- `nextAction = "edit_manually"` keeps the project in `shot_script_in_review`.
- `nextAction = "regenerate"` creates a fresh `shot_script_generate` task and moves the project to `shot_script_generating`.

---

## Domain Model

### Task Type

Add:

- `shot_script_generate`

### Project Statuses

Add:

- `shot_script_generating`
- `shot_script_in_review`
- `shot_script_approved`

### Task Input

`shot_script_generate` task input must be replayable and store snapshots instead of only upstream ids.

Required fields:

- `taskId`
- `projectId`
- `taskType: "shot_script_generate"`
- `sourceStoryboardId`
- `storyboard`
- `promptTemplateKey: "shot_script.generate"`

Optional snapshot fields:

- `sourceMasterPlotId`
- `masterPlot`
- `sourceCharacterSheetBatchId`
- `characterSheets`

The task input should preserve the approved upstream state used for generation so a task can be re-read and audited later without depending on mutable live project data.

### Artifact Shape

Add a stable project-level artifact:

```ts
type ShotScriptArtifact = {
  title: string | null;
  sourceStoryboardId: string;
  shots: ShotScriptItem[];
};

type ShotScriptItem = {
  id: string;
  sceneId: string;
  segmentId: string;
  order: number;
  shotCode: string;
  shotPurpose: string;
  subjectCharacters: string[];
  environment: string;
  framing: string;
  cameraAngle: string;
  composition: string;
  actionMoment: string;
  emotionTone: string;
  continuityNotes: string;
  imagePrompt: string;
  negativePrompt: string | null;
  motionHint: string | null;
  durationSec: number | null;
};
```

Requirements:

- Every shot item must map back to exactly one storyboard segment.
- The object shape must remain stable even when optional values are empty.
- This phase does not generate images or videos.

### Current Asset Model

Add a `CurrentShotScript` model equivalent in purpose to `CurrentStoryboard`:

- id
- title
- sourceStoryboardId
- sourceTaskId
- updatedAt
- approvedAt
- shotCount
- totalDurationSec
- shots

The current model should support both summary reads and full review payloads.

---

## Storage Design

### Prompt Templates

Support the same two-layer template lookup strategy used elsewhere:

- global default: `prompt-templates/shot_script.generate.txt`
- project override: `.local-data/projects/<project>/prompt-templates/shot_script.generate.txt`

Persist prompt-related artifacts for every task:

- template body
- prompt variables snapshot
- rendered prompt text

### Project Asset Paths

Store shot-script assets in a dedicated project directory:

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

### Task Artifact Paths

Continue to store task execution artifacts under the existing task directory:

```text
.local-data/projects/<project>/tasks/<task-id>/
  input.json
  output.json
  log.txt
  prompt-snapshot.json
  raw-response.txt
```

### Versioning Rules

- AI generations create `vN-ai.*`
- manual saves create `vN-human.*`
- `current.*` always reflects the latest promoted version
- versions are append-only and reviewable

Markdown mirrors should be generated for human inspection, while JSON remains the canonical machine-readable source.

---

## API Design

Add a dedicated shot-script API surface instead of reusing storyboard route names.

### Task Creation

- `POST /projects/:projectId/shot-script/generate`

Behavior:

- validate project status is `storyboard_approved`
- capture the approved storyboard snapshot
- optionally capture current approved master-plot and character-sheet snapshots
- create a `shot_script_generate` task
- move project status to `shot_script_generating`

### Read Routes

- `GET /projects/:projectId/shot-script/current`
- `GET /projects/:projectId/shot-script/review`

`current` returns the latest promoted shot script.  
`review` returns the review workspace payload with current document, latest task, latest review summary, and action availability.

### Review Mutation Routes

- `PUT /projects/:projectId/shot-script`
- `POST /projects/:projectId/shot-script/approve`
- `POST /projects/:projectId/shot-script/reject`

The review request/response schemas should parallel existing storyboard behavior, but use shot-script-specific document shapes and status literals.

---

## Worker And Processing Flow

### Processing Steps

`processShotScriptGenerateTask` should:

1. read and validate task input
2. load the effective prompt template
3. render prompt text from task snapshots
4. persist the prompt snapshot
5. call the text-generation provider
6. persist the raw provider response
7. parse and validate a stable `ShotScriptArtifact`
8. write a new `vN-ai` version and update `current`
9. update project status to `shot_script_in_review`
10. mark the task succeeded

### Provider Contract

- This phase uses a text-generation provider only.
- The provider interface should be explicit for shot-script generation rather than overloading storyboard naming.
- The provider result should include raw response text plus parsed shot-script content.

### Error Handling

- invalid project state should fail task creation before queueing
- missing current approved storyboard should fail task creation with a domain error
- parse failures or provider failures should mark the task failed and should not mutate the current shot script
- review actions should fail clearly when no current shot script exists

---

## Review Behavior

### Save Human Version

- available only when a current shot script exists
- writes `vN-human.json` and `vN-human.md`
- promotes that version to `current`
- keeps project status at `shot_script_in_review`

### Approve

- requires a current shot script
- stamps `approvedAt`
- writes any necessary review record
- moves the project to `shot_script_approved`

### Reject

- requires non-empty `reason`
- requires `nextAction`

If `nextAction = "edit_manually"`:

- persist a rejection review record
- keep the project in `shot_script_in_review`

If `nextAction = "regenerate"`:

- persist a rejection review record
- create a new `shot_script_generate` task from the latest approved storyboard context
- move the project to `shot_script_generating`

---

## Testing Strategy

Add test coverage in every layer that already covers `storyboard`.

### Shared

- task type enum includes `shot_script_generate`
- project status enum includes shot-script statuses
- new shot-script API schemas validate accepted payloads and reject malformed ones

### Core

- create-task use case only allows `storyboard_approved`
- task input captures replayable snapshots
- processing writes current and versioned shot-script assets
- review workspace returns correct status and available actions
- save/approve/reject flows update current data and project status correctly

### Services

- default prompt template initialization supports `shot_script.generate`
- shot-script storage reads and writes `current.*` and `versions/*`
- repositories accept new task type and new project statuses
- provider adapters serialize and parse shot-script responses correctly

### API And Worker

- API exposes all shot-script routes
- route integration tests cover generate/current/review/save/approve/reject
- worker integration covers task processing and status transitions
- end-to-end backend flow covers `storyboard_approved -> shot_script_generate -> shot_script_in_review -> approve/reject`

---

## Files Expected To Change

### Shared

- `packages/shared/src/constants/project-status.ts`
- `packages/shared/src/constants/task-type.ts`
- `packages/shared/src/schemas/storyboard-api.ts` or a new shot-script schema module
- related shared tests

### Core

- `packages/core/src/domain/task.ts`
- new shot-script domain file(s)
- `packages/core/src/ports/storyboard-storage.ts` or split ports for shot-script concerns
- new shot-script use cases for create/process/get/save/approve/reject
- related core tests

### Services

- prompt-template initialization and storage services
- file storage for shot-script assets
- repositories that validate task types and project statuses
- provider adapter implementations
- related services tests

### API

- route registration and service bootstrap wiring
- related API integration tests

### Worker

- worker queue registration and task processor wiring
- related worker integration tests

---

## Out Of Scope

- Studio review UI for shot script
- image generation
- video generation
- automatic segment splitting into multiple shots
- timeline editing
- transitions, subtitles, music, dubbing, or final-cut orchestration
- a new generic abstraction that unifies all text asset phases
