# Spec4 Storyboard Review And Manual Editing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the storyboard human review loop so the system can load the current storyboard for review, save whole-document manual edits as new `human` versions, approve or reject the current version with persisted review records, and trigger storyboard regeneration from a reject reason.

**Architecture:** Keep storyboard content history in versioned files plus `storyboard_versions`, add review action history in a new `storyboard_reviews` table, and keep asynchronous regeneration on the existing `StoryboardGenerate` task path. Extend `projects.status` to reflect the storyboard workflow stage, add review-specific use cases in `packages/core`, persist new metadata in `packages/services`, and expose review commands from `apps/api` without pulling in the Spec5 browser workbench.

**Tech Stack:** `pnpm` workspaces, TypeScript, Fastify, Zod, Better SQLite 3, BullMQ, Redis, native `fetch`, Vitest

---

## Chunk 1: Shared Contracts And Workflow State

### Task 1: Add review constants, DTOs, and schemas in `packages/shared`

**Files:**
- Create: `packages/shared/src/constants/storyboard-review-action.ts`
- Create: `packages/shared/src/constants/storyboard-review-next-action.ts`
- Create: `packages/shared/src/types/storyboard-review.ts`
- Modify: `packages/shared/src/constants/project-status.ts`
- Modify: `packages/shared/src/types/project-detail.ts`
- Modify: `packages/shared/src/schemas/project-api.ts`
- Modify: `packages/shared/src/schemas/storyboard-api.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/storyboard-review-api-schema.test.ts`
- Modify: `packages/shared/tests/project-api-schema.test.ts`
- Modify: `packages/shared/tests/storyboard-api-schema.test.ts`

- [ ] **Step 1: Write the failing shared schema tests**

Create `packages/shared/tests/storyboard-review-api-schema.test.ts` and extend the existing project and storyboard schema tests.

Cover:

- expanded `ProjectStatus` values:
  - `script_ready`
  - `storyboard_generating`
  - `storyboard_in_review`
  - `storyboard_approved`
- review request payloads:
  - approve with `storyboardVersionId`
  - reject with `storyboardVersionId`, `reason`, `nextAction`
  - human save with `baseVersionId`, `summary`, `scenes`
- review response payloads:
  - latest review summary
  - review workspace response

- [ ] **Step 2: Run the shared tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/shared test -- project-api-schema
corepack pnpm --filter @sweet-star/shared test -- storyboard-api-schema
corepack pnpm --filter @sweet-star/shared test -- storyboard-review-api-schema
```

Expected: FAIL because the review constants, DTOs, and schemas do not exist yet.

- [ ] **Step 3: Implement the shared constants and DTOs**

Add:

- `StoryboardReviewAction = "approve" | "reject"`
- `StoryboardReviewNextAction = "regenerate" | "edit_manually"`
- types for:
  - `StoryboardReviewRecord`
  - `StoryboardReviewSummary`
  - `StoryboardReviewWorkspace`
  - request payloads for approve, reject, and save-human-version

Keep `StoryboardVersionSummary` and `CurrentStoryboard` unchanged except where review workspace references them.

- [ ] **Step 4: Implement the shared schemas and exports**

Update:

- `project-status.ts` to include the review workflow statuses
- `storyboard-api.ts` to export the new request and review response schemas
- `project-api.ts` to allow the expanded project statuses
- `index.ts` to export the new constants, types, and schemas

- [ ] **Step 5: Run the shared suite**

Run:

```bash
corepack pnpm --filter @sweet-star/shared test
corepack pnpm --filter @sweet-star/shared typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat: add spec4 shared review contracts"
```

## Chunk 2: Core Domain Model And Review Use Cases

### Task 2: Add review domain types, repository ports, and project/task state hooks

**Files:**
- Create: `packages/core/src/domain/storyboard-review.ts`
- Create: `packages/core/src/errors/storyboard-review-errors.ts`
- Create: `packages/core/src/ports/storyboard-review-repository.ts`
- Modify: `packages/core/src/domain/task.ts`
- Modify: `packages/core/src/ports/project-repository.ts`
- Modify: `packages/core/src/ports/task-repository.ts`
- Modify: `packages/core/src/ports/storyboard-version-repository.ts`
- Modify: `packages/core/src/ports/storyboard-provider.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/storyboard-domain.test.ts`
- Create: `packages/core/tests/storyboard-review-domain.test.ts`
- Modify: `packages/core/tests/create-storyboard-generate-task.test.ts`
- Modify: `packages/core/tests/process-storyboard-generate-task.test.ts`

- [ ] **Step 1: Write the failing core contract tests**

Create `packages/core/tests/storyboard-review-domain.test.ts` and extend the task-processing tests.

Cover:

- creating an approve review record
- creating a reject review record with a required reason
- extending `StoryboardGenerateTaskInput` with:
  - `reviewContext.reason`
  - `reviewContext.rejectedVersionId`
- updating project status when:
  - a storyboard generate task is created
  - storyboard generation succeeds

- [ ] **Step 2: Run the core contract tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/core test -- storyboard-review-domain
corepack pnpm --filter @sweet-star/core test -- create-storyboard-generate-task
corepack pnpm --filter @sweet-star/core test -- process-storyboard-generate-task
```

Expected: FAIL because the review domain objects and extra repository methods do not exist yet.

- [ ] **Step 3: Implement the core review domain and ports**

Add:

- domain helpers to build review records
- errors for:
  - stale version actions
  - missing current storyboard
  - reject reason validation
- repository port methods for:
  - inserting review records
  - finding the latest review by project id
  - finding a storyboard version by id
  - finding the latest storyboard task by project id
  - updating project status

Keep the interfaces narrow and aligned to actual use cases instead of adding generic list APIs.

- [ ] **Step 4: Extend generation inputs and state transitions**

Update:

- `domain/task.ts` so task input can carry optional review context
- `create-storyboard-generate-task.ts` so task creation can optionally receive review context and move the project to `storyboard_generating`
- `process-storyboard-generate-task.ts` so successful generation moves the project to `storyboard_in_review` after the new version is persisted and promoted
- `storyboard-provider.ts` so regenerate can pass reject reason into provider generation input

- [ ] **Step 5: Run the core suite**

Run:

```bash
corepack pnpm --filter @sweet-star/core test
corepack pnpm --filter @sweet-star/core typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat: add spec4 core review domain"
```

### Task 3: Add review-oriented core use cases

**Files:**
- Create: `packages/core/src/use-cases/get-storyboard-review.ts`
- Create: `packages/core/src/use-cases/save-human-storyboard-version.ts`
- Create: `packages/core/src/use-cases/approve-storyboard.ts`
- Create: `packages/core/src/use-cases/reject-storyboard.ts`
- Modify: `packages/core/src/use-cases/project-detail-dto.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/get-storyboard-review.test.ts`
- Create: `packages/core/tests/save-human-storyboard-version.test.ts`
- Create: `packages/core/tests/approve-storyboard.test.ts`
- Create: `packages/core/tests/reject-storyboard.test.ts`

- [ ] **Step 1: Write the failing use-case tests**

Create the four use-case test files.

Cover:

- `get-storyboard-review` returns:
  - project status
  - current storyboard
  - latest review
  - latest storyboard task
  - available actions
- `save-human-storyboard-version`:
  - rejects stale `baseVersionId`
  - creates `v2-human.json`
  - inserts a new version row
  - updates `current_storyboard_version_id`
  - keeps project status in `storyboard_in_review`
- `approve-storyboard`:
  - rejects non-current versions
  - inserts an approve review record
  - updates the project to `storyboard_approved`
- `reject-storyboard`:
  - requires a reason
  - with `edit_manually` inserts only a reject review record
  - with `regenerate` creates a new storyboard task with review context and updates the project to `storyboard_generating`

- [ ] **Step 2: Run the use-case tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/core test -- get-storyboard-review
corepack pnpm --filter @sweet-star/core test -- save-human-storyboard-version
corepack pnpm --filter @sweet-star/core test -- approve-storyboard
corepack pnpm --filter @sweet-star/core test -- reject-storyboard
```

Expected: FAIL because the use cases do not exist yet.

- [ ] **Step 3: Implement `get-storyboard-review`**

Build a read model that composes:

- current project detail
- current storyboard document
- latest review summary
- latest storyboard task summary
- available actions derived from current project status and current version presence

- [ ] **Step 4: Implement `save-human-storyboard-version`**

Use the existing storyboard storage adapter to write a new version file such as `v2-human.json`.

Order of operations:

1. load the project and current version
2. reject stale `baseVersionId`
3. compute the next version number
4. write the new storyboard file
5. insert the new version row
6. update the current version pointer
7. keep the project in `storyboard_in_review`

- [ ] **Step 5: Implement `approve-storyboard` and `reject-storyboard`**

Rules:

- both use cases must target the current version only
- `approve` inserts a review row and then updates project status to `storyboard_approved`
- `reject` inserts a reject review row
- `reject` with `regenerate` must call the existing storyboard task creation flow with review context
- `reject` with `edit_manually` must not create a new task

- [ ] **Step 6: Run the core suite**

Run:

```bash
corepack pnpm --filter @sweet-star/core test
corepack pnpm --filter @sweet-star/core typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core
git commit -m "feat: add spec4 storyboard review use cases"
```

## Chunk 3: SQLite Persistence And Provider Prompt Updates

### Task 4: Add SQLite review persistence and project/task lookup helpers

**Files:**
- Modify: `packages/services/src/project-repository/sqlite-schema.ts`
- Modify: `packages/services/src/project-repository/sqlite-project-repository.ts`
- Create: `packages/services/src/storyboard-repository/sqlite-storyboard-review-schema.ts`
- Create: `packages/services/src/storyboard-repository/sqlite-storyboard-review-repository.ts`
- Modify: `packages/services/src/storyboard-repository/sqlite-storyboard-version-repository.ts`
- Modify: `packages/services/src/task-repository/sqlite-task-repository.ts`
- Modify: `packages/services/src/index.ts`
- Test: `packages/services/tests/sqlite-project-repository.test.ts`
- Create: `packages/services/tests/sqlite-storyboard-review-repository.test.ts`
- Modify: `packages/services/tests/sqlite-storyboard-version-repository.test.ts`
- Modify: `packages/services/tests/sqlite-task-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

Create `packages/services/tests/sqlite-storyboard-review-repository.test.ts` and extend the other repository tests.

Cover:

- `storyboard_reviews` table initialization
- `projects.status` update persistence
- `storyboard_versions.findById`
- version numbering across mixed kinds:
  - `v1-ai`
  - `v2-human`
  - `v3-ai`
- finding the latest review by project id
- finding the latest storyboard generate task by project id

- [ ] **Step 2: Run the repository tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/services test -- sqlite-project-repository
corepack pnpm --filter @sweet-star/services test -- sqlite-storyboard-review-repository
corepack pnpm --filter @sweet-star/services test -- sqlite-storyboard-version-repository
corepack pnpm --filter @sweet-star/services test -- sqlite-task-repository
```

Expected: FAIL because the review table and new repository methods do not exist yet.

- [ ] **Step 3: Implement the SQLite schema and repositories**

Add:

- `storyboard_reviews` table
- project status update query in the project repository
- `findById` in the storyboard version repository
- latest-review query in the review repository
- latest-task query in the task repository

Do not copy full storyboard JSON into SQLite.

- [ ] **Step 4: Run the services suite**

Run:

```bash
corepack pnpm --filter @sweet-star/services test
corepack pnpm --filter @sweet-star/services typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/services
git commit -m "feat: add spec4 sqlite review persistence"
```

### Task 5: Extend the Gemini provider and worker-side generation flow for reject context

**Files:**
- Modify: `packages/services/src/providers/gemini-storyboard-provider.ts`
- Modify: `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
- Test: `packages/services/tests/gemini-storyboard-provider.test.ts`
- Modify: `apps/worker/tests/storyboard-worker.integration.test.ts`

- [ ] **Step 1: Write the failing provider and worker tests**

Extend the provider and worker tests.

Cover:

- provider prompt includes reject reason when review context is present
- provider prompt remains unchanged for the first-generation path
- worker processing forwards task `reviewContext.reason`

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/services test -- gemini-storyboard-provider
corepack pnpm --filter @sweet-star/worker test -- storyboard-worker
```

Expected: FAIL because provider generation input does not yet support review context.

- [ ] **Step 3: Implement the prompt extension**

Update the provider request body so regenerate prompts include a short section such as:

```text
Regeneration guidance:
<reject reason>
```

Do not require the previous storyboard document as an input in Spec4.

- [ ] **Step 4: Run the worker-related suite**

Run:

```bash
corepack pnpm --filter @sweet-star/services test -- gemini-storyboard-provider
corepack pnpm --filter @sweet-star/worker test
corepack pnpm --filter @sweet-star/worker typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/services apps/worker
git commit -m "feat: pass reject context into storyboard regeneration"
```

## Chunk 4: API Surface And Service Assembly

### Task 6: Assemble review services in `apps/api`

**Files:**
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/http/error-handler.ts`
- Modify: `apps/api/src/http/register-storyboard-routes.ts`
- Test: `apps/api/tests/projects-api.test.ts`
- Modify: `apps/api/tests/storyboard-api.test.ts`

- [ ] **Step 1: Write the failing API tests**

Extend the API tests to cover:

- project detail returning the new project statuses
- `GET /projects/:projectId/storyboard/review`
- `POST /projects/:projectId/storyboard/save-human-version`
- `POST /projects/:projectId/storyboard/approve`
- `POST /projects/:projectId/storyboard/reject`
- `409` on stale version actions
- `400` on reject without a reason

- [ ] **Step 2: Run the API tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/api test -- projects-api
corepack pnpm --filter @sweet-star/api test -- storyboard-api
```

Expected: FAIL because the review endpoints are not registered yet.

- [ ] **Step 3: Wire the new services**

In `build-spec1-services.ts`, assemble:

- storyboard review repository
- `getStoryboardReview`
- `saveHumanStoryboardVersion`
- `approveStoryboard`
- `rejectStoryboard`

Reuse the existing `createStoryboardGenerateTask` use case inside `rejectStoryboard` instead of duplicating task creation logic.

- [ ] **Step 4: Register the API routes and error handling**

Add route handlers for:

- `GET /projects/:projectId/storyboard/review`
- `POST /projects/:projectId/storyboard/save-human-version`
- `POST /projects/:projectId/storyboard/approve`
- `POST /projects/:projectId/storyboard/reject`

Map domain errors to stable HTTP responses:

- `404` for missing project or missing current storyboard
- `400` for invalid reject payloads
- `409` for stale version actions

- [ ] **Step 5: Run the API suite**

Run:

```bash
corepack pnpm --filter @sweet-star/api test
corepack pnpm --filter @sweet-star/api typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat: expose spec4 storyboard review api"
```

## Chunk 5: End-To-End Review Flow Verification

### Task 7: Verify regenerate and manual-edit review flows end to end

**Files:**
- Create: `apps/api/tests/spec4-storyboard-review-flow.integration.test.ts`
- Modify: `apps/api/tests/spec3-storyboard-flow.integration.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing Spec4 integration tests**

Create `apps/api/tests/spec4-storyboard-review-flow.integration.test.ts`.

Cover two full flows:

Flow A, reject and regenerate:

1. create a project
2. create and finish the first storyboard generation task
3. call reject with:
   - current version id
   - reason
   - `nextAction = "regenerate"`
4. assert a new storyboard task is created
5. run the worker
6. assert the next storyboard version is `v2-ai.json`
7. assert the latest review row points at the triggered task id

Flow B, reject and manual save:

1. create a project and finish the first storyboard generation task
2. call reject with:
   - current version id
   - reason
   - `nextAction = "edit_manually"`
3. call save-human-version with edited storyboard content
4. assert `v2-human.json` exists
5. assert current version pointer now points at the human version
6. call approve on the human version
7. assert project status becomes `storyboard_approved`

- [ ] **Step 2: Run the new integration test to verify it fails**

Run:

```bash
corepack pnpm --filter @sweet-star/api test -- spec4-storyboard-review-flow
```

Expected: FAIL until the full Spec4 dependency chain is wired.

- [ ] **Step 3: Fix any integration seams exposed by the test**

Only patch issues that block the two Spec4 flows:

- review workspace aggregation
- reject-triggered task creation
- human version file persistence
- project status transitions

Do not add version history browsing or UI concerns.

- [ ] **Step 4: Update runtime documentation**

Update `README.md` with:

- the new project statuses
- the new review endpoints
- the meaning of:
  - approve
  - reject with regenerate
  - reject with edit-manually
- the fact that human saves create `vN-human.json` files under `.local-data/`

- [ ] **Step 5: Run full verification**

Run:

```bash
corepack pnpm test
corepack pnpm typecheck
```

Expected:

- all workspace tests pass
- all typechecks pass
- reject and regenerate flows are proven end to end
- manual save and approve flows are proven end to end

- [ ] **Step 6: Commit**

```bash
git add apps/api README.md
git commit -m "test: verify spec4 storyboard review flow"
```
