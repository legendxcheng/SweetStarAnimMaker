# Spec4 Storyboard Review And Manual Editing Design

## Context

The current repository already implements Spec1 through Spec3 as a Node/TypeScript `pnpm` monorepo. `apps/api` exposes project, task, and storyboard read endpoints, `apps/worker` processes `StoryboardGenerate` tasks, `packages/core` owns domain rules and use cases, and `packages/services` owns SQLite, filesystem, queue, and provider adapters.

Spec3 established the storyboard version model:

- storyboard files are persisted under project storage
- SQLite indexes storyboard versions in `storyboard_versions`
- `projects.current_storyboard_version_id` points at the active version
- the first version kind is `ai`

`docs/prd/MVP-Specs.md` defines Spec4 as the human review loop for generated storyboard results. This delivery must let an operator load the current storyboard, save manual edits as a new human version, approve or reject the current version, persist review decisions, and trigger regeneration from a reject reason without introducing image or video workflow concerns.

## Goal

Provide the first complete human-in-the-loop storyboard review workflow that can:

- load the current storyboard version for review
- save edited storyboard content as a new `human` version
- approve the current storyboard version
- reject the current storyboard version with a required reason
- choose either regenerate or edit-manually as the post-reject path
- persist review decisions in SQLite
- update project status based on review outcomes
- create a new `StoryboardGenerate` task when reject chooses regenerate

## Decisions

### 1. Mixed Review Model

Spec4 should split storyboard content history from review action history.

- `storyboard_versions` remains the source of truth for content evolution
- a new `storyboard_reviews` table records approve and reject actions
- `StoryboardGenerate` tasks remain the mechanism for asynchronous regeneration
- `projects.status` reflects the current workflow stage, not every technical event

This matches the PRD requirement that generated content can be reviewed, modified, regenerated, and traced without coupling all of that behavior to either versions alone or tasks alone.

### 2. Storyboard Versions Continue To Own Content

Manual editing should create a new version instead of mutating an existing file.

- AI generation continues to create versions like `v1-ai.json`
- manual save creates versions like `v2-human.json`
- later regeneration can create `v3-ai.json`
- `projects.current_storyboard_version_id` always points at the currently active version

Reject must not clear the current version pointer. The currently active storyboard remains readable until a new version is created and promoted.

### 3. Review Records Own Audit History

Add a `storyboard_reviews` table with one row per review action.

Required fields:

- `id`
- `project_id`
- `storyboard_version_id`
- `action`, values `approve | reject`
- `reason`, required for reject and optional for approve
- `triggered_task_id`, nullable and set when reject triggers regeneration
- `created_at`

Review records should not be embedded into storyboard version metadata. The same version may accumulate multiple review actions over time, and reject needs to preserve both the operator reason and the follow-up path.

### 4. Project Status Should Track Review Workflow

`ProjectStatus` should grow beyond `script_ready` and express the current storyboard phase.

Recommended values for Spec4:

- `script_ready`
- `storyboard_generating`
- `storyboard_in_review`
- `storyboard_approved`

Recommended transitions:

1. creating a storyboard generation task moves the project to `storyboard_generating`
2. successful storyboard generation moves the project to `storyboard_in_review`
3. saving a human version keeps the project in `storyboard_in_review`
4. approving the current version moves the project to `storyboard_approved`
5. rejecting with regenerate moves the project back to `storyboard_generating`
6. rejecting with edit-manually keeps the project in `storyboard_in_review`

Task status should stay as the current technical lifecycle:

- `pending`
- `running`
- `succeeded`
- `failed`

Spec4 should not overload task status with review semantics.

### 5. Manual Save Is Whole-Document Save In MVP

The internal document model remains scene-structured, but the save API should accept the entire storyboard document as one payload.

Request shape should include:

- `baseVersionId`
- `summary`
- `scenes`

Rules:

- the save must target the current version only
- the service creates the next `human` version number
- the previous version remains intact
- saving a human version does not imply approval

This keeps the MVP simple while preserving future room for scene-level editing or patch APIs.

### 6. Approve May Target AI Or Human Versions

Approval should be allowed for the current version regardless of whether it is `ai` or `human`.

Rules:

- approve operates on the current version only
- the review record captures the approved version id and kind indirectly through the version link
- approve may optionally include a note
- project status becomes `storyboard_approved`

This preserves operator flexibility while keeping the audit trail explicit.

### 7. Reject Requires A Reason And Splits Into Two Paths

Reject should not be a standalone state toggle. It must include a reason and a next action.

Required reject request fields:

- `storyboardVersionId`
- `reason`
- `nextAction`

`nextAction` values:

- `regenerate`
- `edit_manually`

Behavior for `regenerate`:

1. validate that the rejected version is the current version
2. write a reject review record
3. create a new `StoryboardGenerate` task
4. attach the new task id to the review record
5. move the project to `storyboard_generating`
6. keep the current storyboard pointer unchanged until the new version succeeds

Behavior for `edit_manually`:

1. validate that the rejected version is the current version
2. write a reject review record
3. do not create a new task
4. keep the project in `storyboard_in_review`

### 8. Regenerate Uses Script Plus Reject Reason In MVP

Spec4 should extend the storyboard generation task input with optional review context, but the initial generation logic should stay compatible with Spec3.

Recommended task input extension:

- `reviewContext.reason`
- `reviewContext.rejectedVersionId`

MVP generation behavior:

- always use the original project script as the base input
- include the reject reason as additional generation guidance
- keep `rejectedVersionId` for traceability and logging

Spec4 should not yet require the model to ingest the previous storyboard document as generation input.

### 9. API Surface

Spec4 should keep the read endpoints introduced in Spec3 and add review-oriented commands.

Retain:

- `GET /projects/:projectId`
- `GET /projects/:projectId/storyboard/current`

Add:

- `GET /projects/:projectId/storyboard/review`
- `POST /projects/:projectId/storyboard/save-human-version`
- `POST /projects/:projectId/storyboard/approve`
- `POST /projects/:projectId/storyboard/reject`

`GET /projects/:projectId/storyboard/review` should return a compact review workspace payload:

- `projectId`
- `projectStatus`
- `currentStoryboard`
- `latestReview`
- `availableActions`
- `latestStoryboardTask`

This keeps the browser workbench in Spec5 from needing to reconstruct review state by stitching together several endpoints.

### 10. Storage Model

Filesystem remains the source of truth for storyboard documents.

Example project layout:

```text
.local-data/
  projects/
    <projectId-slug>/
      storyboards/
        raw/
          <taskId>-gemini-response.json
        versions/
          v1-ai.json
          v2-human.json
          v3-ai.json
```

SQLite stores only metadata and workflow records:

- `storyboard_versions`
- `storyboard_reviews`
- `projects.current_storyboard_version_id`
- `projects.status`

No full storyboard document content should be copied into SQLite.

### 11. Error Handling Rules

Spec4 must preserve truthful state across content writes, review writes, and task creation.

Manual save failure rules:

- if the new storyboard file write fails, do not insert a version row
- if the version row insert fails, do not update the current pointer
- current storyboard remains unchanged on failure

Approve failure rules:

- if the review record cannot be written, do not move the project to `storyboard_approved`

Reject plus regenerate failure rules:

- if the reject review record cannot be written, reject fails
- if task creation fails after the reject action begins, the operation should be treated as failed and should not leave a dangling reject record that claims regeneration happened
- project status must not move to `storyboard_generating` unless the new task exists

Reject plus edit-manually failure rules:

- if the review record write fails, reject fails
- if the review record write succeeds, no other side effects are required

Concurrency rule:

- approve, reject, and save-human-version must reject requests that target a non-current version

### 12. Testing Strategy

Spec4 should be verified through shared schema tests, core use case tests, service repository tests, and API integration tests.

Shared contract tests:

- `human` storyboard version schemas
- review record and request schemas
- review workspace response schema
- expanded project status schema

Core use case tests:

- saving a whole storyboard document creates a new `human` version
- saving a human version updates the current pointer
- approve on the current version writes a review record and updates project status
- reject on the current version requires a reason
- reject with `regenerate` creates a new storyboard task
- reject with `edit_manually` does not create a task
- stale-version actions are rejected

Service adapter tests:

- SQLite review repository persists and queries review records
- mixed version sequences like `v2-human` then `v3-ai` increment correctly
- file-write failure does not advance the current version pointer

API and end-to-end tests:

- current storyboard can be loaded for review
- human save returns a new current `human` version
- approve persists correctly
- reject persists correctly
- reject with regenerate creates a new task and moves the project back to generating
- reject with edit-manually leaves the project in review

## Out Of Scope

Spec4 does not include:

- scene-level patch or partial-save APIs
- storyboard version history browsing UI
- version rollback UI
- image review workflow
- video review workflow
- prompt-diff editing based on the previous storyboard document
- any Spec5 browser workbench implementation

## Completion Definition

Spec4 is complete when:

- the current storyboard can be loaded into a review-oriented API response
- a manual whole-document save creates a new `human` storyboard version
- the current version pointer updates correctly after a successful human save
- approve persists a review record and moves the project to `storyboard_approved`
- reject requires a reason and persists a review record
- reject can either trigger regeneration or leave the operator in manual-edit flow
- regeneration creates a new storyboard generation task with reject context
- project status reflects the current review workflow stage
- automated tests prove version persistence, review persistence, regeneration triggering, and stale-version protection
