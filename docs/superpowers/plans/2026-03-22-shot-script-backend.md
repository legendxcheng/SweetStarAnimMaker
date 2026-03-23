# Shot Script Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the formal `storyboard -> shot_script` backend phase with replayable generation tasks, versioned storage, review actions, and project-status transitions through `shot_script_approved`.

**Architecture:** Mirror the existing `storyboard` backend flow with explicit `shot_script` types, use cases, storage, provider contracts, API routes, and worker wiring. Keep the implementation phase-specific rather than introducing a generic text-asset abstraction, but extend project summaries and persistence so downstream consumers can see `currentShotScript` and enforce `shot_script_*` status gates.

**Tech Stack:** TypeScript, Zod, Vitest, Fastify, BullMQ, SQLite, filesystem-backed local storage

---

## Spec Reference

- `docs/superpowers/specs/2026-03-22-shot-script-backend-design.md`

## File Map

### Shared Contracts

- Modify: `packages/shared/src/constants/project-status.ts`
  - Add `shot_script_generating`, `shot_script_in_review`, and `shot_script_approved`.
- Modify: `packages/shared/src/constants/task-type.ts`
  - Add `shot_script_generate`.
- Create: `packages/shared/src/schemas/shot-script-api.ts`
  - Define current-shot-script, review, save, approve, and reject schemas.
- Modify: `packages/shared/src/schemas/project-api.ts`
  - Add `currentShotScript` to project list/detail payloads.
- Modify: `packages/shared/src/schemas/task-api.ts`
  - Export a create-task response alias for `shot_script_generate`.
- Create: `packages/shared/src/types/shot-script.ts`
  - Define `CurrentShotScriptSummary`, `CurrentShotScript`, `ShotScriptItem`, and related shapes.
- Create: `packages/shared/src/types/shot-script-review.ts`
  - Define review request and workspace types.
- Modify: `packages/shared/src/types/project-detail.ts`
  - Add `currentShotScript`.
- Modify: `packages/shared/src/types/project-summary.ts`
  - Add `currentShotScript`.
- Modify: `packages/shared/src/index.ts`
  - Export new schemas and types.
- Create: `packages/shared/tests/shot-script-api-schema.test.ts`
  - Validate shot-script request/response schemas.
- Modify: `packages/shared/tests/project-api-schema.test.ts`
  - Cover `currentShotScript` in project payloads.
- Modify: `packages/shared/tests/task-api-schema.test.ts`
  - Cover `shot_script_generate`.

### Core Domain And Use Cases

- Modify: `packages/core/src/domain/task.ts`
  - Add `shotScriptGenerateQueueName` and `ShotScriptGenerateTaskInput`.
- Create: `packages/core/src/domain/shot-script.ts`
  - Centralize file names, rel paths, version id helpers, summary conversion, and markdown rendering helpers.
- Create: `packages/core/src/domain/shot-script-review.ts`
  - Create shot-script review record helpers.
- Create: `packages/core/src/ports/shot-script-provider.ts`
  - Define the generation provider contract.
- Create: `packages/core/src/ports/shot-script-storage.ts`
  - Define current/version/prompt/raw-response storage contract.
- Create: `packages/core/src/ports/shot-script-review-repository.ts`
  - Define latest-review lookup and insert contract.
- Modify: `packages/core/src/ports/project-repository.ts`
  - Add `updateCurrentShotScript`.
- Modify: `packages/core/src/use-cases/project-detail-dto.ts`
  - Map `currentShotScript`.
- Modify: `packages/core/src/use-cases/project-summary-dto.ts`
  - Map `currentShotScript`.
- Create: `packages/core/src/use-cases/create-shot-script-generate-task.ts`
- Create: `packages/core/src/use-cases/process-shot-script-generate-task.ts`
- Create: `packages/core/src/use-cases/get-current-shot-script.ts`
- Create: `packages/core/src/use-cases/get-shot-script-review.ts`
- Create: `packages/core/src/use-cases/save-human-shot-script.ts`
- Create: `packages/core/src/use-cases/approve-shot-script.ts`
- Create: `packages/core/src/use-cases/reject-shot-script.ts`
- Modify: `packages/core/src/index.ts`
  - Export shot-script domain, ports, and use cases.
- Create: `packages/core/tests/create-shot-script-generate-task.test.ts`
- Create: `packages/core/tests/process-shot-script-generate-task.test.ts`
- Create: `packages/core/tests/get-current-shot-script.test.ts`
- Create: `packages/core/tests/get-shot-script-review.test.ts`
- Create: `packages/core/tests/save-human-shot-script.test.ts`
- Create: `packages/core/tests/approve-shot-script.test.ts`
- Create: `packages/core/tests/reject-shot-script.test.ts`
- Modify: `packages/core/tests/get-project-detail.test.ts`
- Modify: `packages/core/tests/list-projects.test.ts`

### Services

- Create: `packages/services/src/storage/shot-script-storage.ts`
  - Implement prompt template init/read plus current/version/raw/prompt persistence.
- Modify: `packages/services/src/storage/local-data-paths.ts`
  - Add shot-script paths if centralized there.
- Create: `packages/services/src/providers/gemini-shot-script-provider.ts`
  - Implement the text provider adapter.
- Create: `packages/services/src/shot-script-repository/sqlite-shot-script-review-repository.ts`
  - Persist review records and latest-review lookup.
- Create: `packages/services/src/shot-script-repository/sqlite-shot-script-review-schema.ts`
  - Create/migrate review table.
- Modify: `packages/services/src/project-repository/sqlite-project-repository.ts`
  - Store `current_shot_script_id` and normalize new statuses.
- Modify: `packages/services/src/project-repository/sqlite-schema.ts`
  - Add `current_shot_script_id` and initialize shot-script review schema.
- Modify: `packages/services/src/task-repository/sqlite-task-schema.ts`
  - Accept `shot_script_generate`.
- Modify: `packages/services/src/index.ts`
  - Export shot-script storage/provider/repository factories.
- Create: `packages/services/tests/shot-script-storage.test.ts`
- Create: `packages/services/tests/default-shot-script-prompt-template.test.ts`
- Create: `packages/services/tests/gemini-shot-script-provider.test.ts`
- Create: `packages/services/tests/sqlite-shot-script-review-repository.test.ts`
- Modify: `packages/services/tests/sqlite-project-repository.test.ts`
- Modify: `packages/services/tests/sqlite-task-repository.test.ts`

### API And Worker

- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
  - Build shot-script services, storage, provider, and review repository dependencies.
- Modify: `apps/api/src/http/register-task-routes.ts` or create a dedicated shot-script route module
  - Expose `POST /projects/:projectId/shot-script/generate`.
- Modify: `apps/api/src/http/register-storyboard-routes.ts` or split into dedicated route modules
  - Expose `current`, `review`, `save`, `approve`, and `reject` routes under `/shot-script`.
- Create: `apps/api/tests/shot-script-api.test.ts`
- Create: `apps/api/tests/spec6-shot-script-flow.integration.test.ts`
- Modify: `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
  - Construct the shot-script processor and provider.
- Modify: `apps/worker/src/index.ts`
  - Register the shot-script queue and processor.
- Create: `apps/worker/tests/shot-script-worker.integration.test.ts`

## Constraints

- Follow `@superpowers/test-driven-development` for each chunk: write/adjust the failing tests first, then implement the minimum code to make them pass.
- Do not refactor `master_plot`, `storyboard`, or character-sheet code into a new generic abstraction in this task.
- Preserve existing route and storage behavior for earlier phases; add shot-script support without breaking current flows.
- Keep `one storyboard segment = one shot-script item` hard-coded for this milestone.
- Do not add Studio UI work in this plan beyond shared/project payload support needed by future consumers.

## Chunk 1: Shared Contracts And Project Surface

### Task 1: Add shot-script shared types and schema coverage

**Files:**
- Modify: `packages/shared/src/constants/project-status.ts`
- Modify: `packages/shared/src/constants/task-type.ts`
- Create: `packages/shared/src/schemas/shot-script-api.ts`
- Create: `packages/shared/src/types/shot-script.ts`
- Create: `packages/shared/src/types/shot-script-review.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/shot-script-api-schema.test.ts`
- Modify: `packages/shared/tests/task-api-schema.test.ts`

- [ ] **Step 1: Write the failing shared-contract tests**

```ts
expect(taskTypes).toContain("shot_script_generate");
expect(projectStatuses).toContain("shot_script_in_review");

const parsed = currentShotScriptResponseSchema.parse({
  id: "shot_script_20260322_ab12cd",
  title: "Ep01 Shot Script",
  sourceStoryboardId: "storyboard_20260322_ab12cd",
  sourceTaskId: "task_20260322_shot_script",
  updatedAt: "2026-03-22T12:00:00.000Z",
  approvedAt: null,
  shots: [
    {
      id: "shot_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      order: 1,
      shotCode: "S01-SG01",
      shotPurpose: "Establish the flooded market",
      subjectCharacters: ["Rin"],
      environment: "Flooded dawn market",
      framing: "medium wide shot",
      cameraAngle: "eye level",
      composition: "Rin framed by hanging lanterns",
      actionMoment: "Rin pauses at the waterline",
      emotionTone: "uneasy anticipation",
      continuityNotes: "Keep soaked satchel on left shoulder",
      imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
      negativePrompt: null,
      motionHint: null,
      durationSec: 4,
    },
  ],
});

expect(parsed.shots).toHaveLength(1);
```

- [ ] **Step 2: Run the targeted shared tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/shared test -- shot-script-api-schema.test.ts task-api-schema.test.ts`

Expected: FAIL because shot-script task/status enums and schemas do not exist yet.

- [ ] **Step 3: Implement the new shared types and schemas**

```ts
export const currentShotScriptSummaryResponseSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).nullable(),
  sourceStoryboardId: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  shotCount: z.number().int().positive(),
  totalDurationSec: z.number().int().positive().nullable(),
});

export const rejectShotScriptRequestSchema = z.object({
  reason: z.string().trim().min(1),
  nextAction: z.enum(["edit_manually", "regenerate"]),
});
```

- [ ] **Step 4: Re-run the targeted shared tests**

Run: `corepack pnpm --filter @sweet-star/shared test -- shot-script-api-schema.test.ts task-api-schema.test.ts`

Expected: PASS with new shot-script schemas exported through `packages/shared/src/index.ts`.

- [ ] **Step 5: Commit the shared shot-script contracts**

```bash
git add packages/shared/src packages/shared/tests
git commit -m "feat: add shot script shared contracts"
```

### Task 2: Extend project list/detail payloads with `currentShotScript`

**Files:**
- Modify: `packages/shared/src/schemas/project-api.ts`
- Modify: `packages/shared/src/types/project-detail.ts`
- Modify: `packages/shared/src/types/project-summary.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/tests/project-api-schema.test.ts`

- [ ] **Step 1: Write the failing project-payload test**

```ts
const parsed = projectDetailResponseSchema.parse({
  ...baseProject,
  currentShotScript: {
    id: "shot_script_1",
    title: "Episode 1 Shot Script",
    sourceStoryboardId: "storyboard_1",
    sourceTaskId: "task_1",
    updatedAt: "2026-03-22T12:00:00.000Z",
    approvedAt: null,
    shotCount: 12,
    totalDurationSec: 46,
  },
});

expect(parsed.currentShotScript?.shotCount).toBe(12);
```

- [ ] **Step 2: Run the targeted test**

Run: `corepack pnpm --filter @sweet-star/shared test -- project-api-schema.test.ts`

Expected: FAIL because project schemas and TS types do not yet include `currentShotScript`.

- [ ] **Step 3: Add `currentShotScript` to project schemas and types**

```ts
export const projectDetailResponseSchema = z.object({
  // existing fields
  currentMasterPlot: currentMasterPlotResponseSchema.nullable(),
  currentCharacterSheetBatch: currentCharacterSheetBatchSummaryResponseSchema.nullable(),
  currentStoryboard: currentStoryboardSummaryResponseSchema.nullable(),
  currentShotScript: currentShotScriptSummaryResponseSchema.nullable(),
});
```

- [ ] **Step 4: Re-run the targeted project schema test**

Run: `corepack pnpm --filter @sweet-star/shared test -- project-api-schema.test.ts`

Expected: PASS with `currentShotScript` accepted in both project summary and detail payloads.

- [ ] **Step 5: Commit the project payload extension**

```bash
git add packages/shared/src packages/shared/tests
git commit -m "feat: expose current shot script in project payloads"
```

## Chunk 2: Core Domain And Use Cases

### Task 3: Add core shot-script domain helpers and task creation flow

**Files:**
- Modify: `packages/core/src/domain/task.ts`
- Create: `packages/core/src/domain/shot-script.ts`
- Create: `packages/core/src/ports/shot-script-storage.ts`
- Create: `packages/core/src/ports/shot-script-provider.ts`
- Modify: `packages/core/src/ports/project-repository.ts`
- Create: `packages/core/src/use-cases/create-shot-script-generate-task.ts`
- Create: `packages/core/src/use-cases/get-current-shot-script.ts`
- Modify: `packages/core/src/use-cases/project-detail-dto.ts`
- Modify: `packages/core/src/use-cases/project-summary-dto.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/create-shot-script-generate-task.test.ts`
- Create: `packages/core/tests/get-current-shot-script.test.ts`
- Modify: `packages/core/tests/get-project-detail.test.ts`
- Modify: `packages/core/tests/list-projects.test.ts`

- [ ] **Step 1: Write the failing core tests for task creation and project DTOs**

```ts
expect(result.type).toBe("shot_script_generate");
expect(projectRepository.updateStatus).toHaveBeenCalledWith({
  projectId: "proj_1",
  status: "shot_script_generating",
  updatedAt: "2026-03-22T12:00:00.000Z",
});
expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith(
  expect.objectContaining({
    input: expect.objectContaining({
      taskType: "shot_script_generate",
      sourceStoryboardId: "storyboard_approved_1",
      storyboard: expect.any(Object),
      promptTemplateKey: "shot_script.generate",
    }),
  }),
);
expect(detail.currentShotScript?.id).toBe("shot_script_current_1");
```

- [ ] **Step 2: Run the targeted core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- create-shot-script-generate-task.test.ts get-current-shot-script.test.ts get-project-detail.test.ts list-projects.test.ts`

Expected: FAIL because the task type, queue name, project pointer, and DTO mappings do not exist.

- [ ] **Step 3: Implement the domain helpers and create-task use case**

```ts
export const shotScriptGenerateQueueName = "shot-script-generate";

export interface ShotScriptGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "shot_script_generate";
  sourceStoryboardId: string;
  sourceMasterPlotId?: string;
  sourceCharacterSheetBatchId?: string;
  storyboard: CurrentStoryboard;
  masterPlot?: CurrentMasterPlot;
  characterSheets?: Array<{
    characterId: string;
    characterName: string;
    promptTextCurrent: string;
    imageAssetPath?: string | null;
  }>;
  promptTemplateKey: "shot_script.generate";
}
```

- [ ] **Step 4: Re-run the targeted core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- create-shot-script-generate-task.test.ts get-current-shot-script.test.ts get-project-detail.test.ts list-projects.test.ts`

Expected: PASS with replayable task input and project DTOs exposing `currentShotScript`.

- [ ] **Step 5: Commit the shot-script core scaffolding**

```bash
git add packages/core/src packages/core/tests
git commit -m "feat: add shot script task creation and dto support"
```

### Task 4: Implement shot-script processing and review use cases

**Files:**
- Create: `packages/core/src/domain/shot-script-review.ts`
- Create: `packages/core/src/ports/shot-script-review-repository.ts`
- Create: `packages/core/src/use-cases/process-shot-script-generate-task.ts`
- Create: `packages/core/src/use-cases/get-shot-script-review.ts`
- Create: `packages/core/src/use-cases/save-human-shot-script.ts`
- Create: `packages/core/src/use-cases/approve-shot-script.ts`
- Create: `packages/core/src/use-cases/reject-shot-script.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/process-shot-script-generate-task.test.ts`
- Create: `packages/core/tests/get-shot-script-review.test.ts`
- Create: `packages/core/tests/save-human-shot-script.test.ts`
- Create: `packages/core/tests/approve-shot-script.test.ts`
- Create: `packages/core/tests/reject-shot-script.test.ts`

- [ ] **Step 1: Write the failing processing and review tests**

```ts
expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith(
  expect.objectContaining({
    shotScript: expect.objectContaining({
      sourceStoryboardId: "storyboard_approved_1",
      shots: expect.arrayContaining([
        expect.objectContaining({
          segmentId: "segment_1",
          shotCode: "S01-SG01",
        }),
      ]),
    }),
  }),
);

expect(projectRepository.updateStatus).toHaveBeenCalledWith({
  projectId: "proj_1",
  status: "shot_script_in_review",
  updatedAt: "2026-03-22T12:10:00.000Z",
});

expect(review.latestReview?.action).toBe("reject");
expect(saved.approvedAt).toBeNull();
expect(approved.approvedAt).toBe("2026-03-22T12:30:00.000Z");
```

- [ ] **Step 2: Run the targeted core test suite**

Run: `corepack pnpm --filter @sweet-star/core test -- process-shot-script-generate-task.test.ts get-shot-script-review.test.ts save-human-shot-script.test.ts approve-shot-script.test.ts reject-shot-script.test.ts`

Expected: FAIL because there are no shot-script process/save/approve/reject use cases or review records.

- [ ] **Step 3: Implement the processing and review use cases**

```ts
const latestTask = await dependencies.taskRepository.findLatestByProjectId(
  project.id,
  "shot_script_generate",
);

return {
  projectId: project.id,
  projectName: project.name,
  projectStatus: project.status,
  currentShotScript,
  latestReview: latestReview ?? null,
  availableActions: {
    save: project.status === "shot_script_in_review",
    approve: project.status === "shot_script_in_review",
    reject: project.status === "shot_script_in_review",
  },
  latestTask: latestTask ? toTaskDetailDto(latestTask) : null,
};
```

- [ ] **Step 4: Re-run the targeted core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- process-shot-script-generate-task.test.ts get-shot-script-review.test.ts save-human-shot-script.test.ts approve-shot-script.test.ts reject-shot-script.test.ts`

Expected: PASS with stable processing, promoted `vN-ai`/`vN-human` behavior, and correct `edit_manually` vs `regenerate` status transitions.

- [ ] **Step 5: Commit the core review flow**

```bash
git add packages/core/src packages/core/tests
git commit -m "feat: add shot script review use cases"
```

## Chunk 3: Services Persistence And Provider Adapters

### Task 5: Implement filesystem storage and default prompt support

**Files:**
- Create: `packages/services/src/storage/shot-script-storage.ts`
- Modify: `packages/services/src/storage/local-data-paths.ts`
- Modify: `packages/services/src/index.ts`
- Create: `packages/services/tests/shot-script-storage.test.ts`
- Create: `packages/services/tests/default-shot-script-prompt-template.test.ts`

- [ ] **Step 1: Write the failing storage tests**

```ts
expect(await readJson(paths.projectPath(projectId, "shot-script/current.json"))).toEqual(
  expect.objectContaining({
    id: "shot_script_1",
    shots: expect.arrayContaining([expect.objectContaining({ segmentId: "segment_1" })]),
  }),
);

expect(await readFile(paths.projectPath(projectId, "prompt-templates/shot_script.generate.txt"), "utf8"))
  .toContain("{{storyboard.title}}");
```

- [ ] **Step 2: Run the targeted services tests**

Run: `corepack pnpm --filter @sweet-star/services test -- shot-script-storage.test.ts default-shot-script-prompt-template.test.ts`

Expected: FAIL because there is no shot-script storage implementation or default template initialization.

- [ ] **Step 3: Implement shot-script storage**

```ts
export function createShotScriptStorage(options: CreateShotScriptStorageOptions): ShotScriptStorage {
  return {
    async initializePromptTemplate(input) {
      if (input.promptTemplateKey !== "shot_script.generate") return;
      await ensureFileWithDefaultTemplate(/* project override path */);
    },
    async writeCurrentShotScript(input) {
      await writeJson(currentJsonPath, input.shotScript);
      await writeFile(currentMarkdownPath, toShotScriptMarkdown(input.shotScript));
    },
    async writeShotScriptVersion(input) {
      await writeJson(versionJsonPath, input.shotScript);
      await writeFile(versionMarkdownPath, toShotScriptMarkdown(input.shotScript));
    },
  };
}
```

- [ ] **Step 4: Re-run the targeted services tests**

Run: `corepack pnpm --filter @sweet-star/services test -- shot-script-storage.test.ts default-shot-script-prompt-template.test.ts`

Expected: PASS with `current.*`, `versions/*`, and project-level prompt-template files created correctly.

- [ ] **Step 5: Commit the shot-script storage layer**

```bash
git add packages/services/src packages/services/tests prompt-templates
git commit -m "feat: add shot script storage and prompt template support"
```

### Task 6: Add SQLite persistence and provider adapters

**Files:**
- Create: `packages/services/src/providers/gemini-shot-script-provider.ts`
- Create: `packages/services/src/shot-script-repository/sqlite-shot-script-review-repository.ts`
- Create: `packages/services/src/shot-script-repository/sqlite-shot-script-review-schema.ts`
- Modify: `packages/services/src/project-repository/sqlite-project-repository.ts`
- Modify: `packages/services/src/project-repository/sqlite-schema.ts`
- Modify: `packages/services/src/task-repository/sqlite-task-schema.ts`
- Modify: `packages/services/src/index.ts`
- Create: `packages/services/tests/gemini-shot-script-provider.test.ts`
- Create: `packages/services/tests/sqlite-shot-script-review-repository.test.ts`
- Modify: `packages/services/tests/sqlite-project-repository.test.ts`
- Modify: `packages/services/tests/sqlite-task-repository.test.ts`

- [ ] **Step 1: Write the failing repository and provider tests**

```ts
expect(repository.findById("proj_1")?.currentShotScriptId).toBe("shot_script_1");
expect(repository.findLatestByProjectId("proj_1")?.action).toBe("approve");
expect(task.type).toBe("shot_script_generate");
expect(result.shotScript.shots[0]?.segmentId).toBe("segment_1");
```

- [ ] **Step 2: Run the targeted services tests**

Run: `corepack pnpm --filter @sweet-star/services test -- gemini-shot-script-provider.test.ts sqlite-shot-script-review-repository.test.ts sqlite-project-repository.test.ts sqlite-task-repository.test.ts`

Expected: FAIL because SQLite schemas, repositories, and the provider adapter do not yet know about shot-script data.

- [ ] **Step 3: Implement the repository and provider changes**

```ts
ensureProjectsColumn(db, "current_shot_script_id", "TEXT NULL");

switch (status) {
  case "shot_script_generating":
  case "shot_script_in_review":
  case "shot_script_approved":
    return status;
}

export async function generateShotScript(input: GenerateShotScriptInput) {
  return {
    rawResponse,
    shotScript: parsedShotScript,
  };
}
```

- [ ] **Step 4: Re-run the targeted services tests**

Run: `corepack pnpm --filter @sweet-star/services test -- gemini-shot-script-provider.test.ts sqlite-shot-script-review-repository.test.ts sqlite-project-repository.test.ts sqlite-task-repository.test.ts`

Expected: PASS with `current_shot_script_id`, new statuses, new task type, and provider parsing working.

- [ ] **Step 5: Commit the persistence and provider layer**

```bash
git add packages/services/src packages/services/tests
git commit -m "feat: add shot script repositories and provider"
```

## Chunk 4: API And Worker Wiring

### Task 7: Wire shot-script services and HTTP routes

**Files:**
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/http/register-task-routes.ts` or create a dedicated shot-script route file
- Modify: `apps/api/src/http/register-storyboard-routes.ts` or split shot-script routes into a new module
- Create: `apps/api/tests/shot-script-api.test.ts`

- [ ] **Step 1: Write the failing API route tests**

```ts
const generateResponse = await app.inject({
  method: "POST",
  url: "/projects/proj_1/shot-script/generate",
});

expect(generateResponse.statusCode).toBe(201);

const reviewResponse = await app.inject({
  method: "GET",
  url: "/projects/proj_1/shot-script/review",
});

expect(reviewResponse.json().projectStatus).toBe("shot_script_in_review");
```

- [ ] **Step 2: Run the targeted API test**

Run: `corepack pnpm --filter @sweet-star/api test -- shot-script-api.test.ts`

Expected: FAIL because the service bootstrap and routes do not expose any shot-script behavior yet.

- [ ] **Step 3: Wire the API services and routes**

```ts
app.post("/projects/:projectId/shot-script/generate", async (request, reply) => {
  const params = request.params as { projectId: string };
  const task = await services.createShotScriptGenerateTask.execute({ projectId: params.projectId });
  return reply.status(201).send(task);
});

app.post("/projects/:projectId/shot-script/reject", async (request) => {
  const params = request.params as { projectId: string };
  const payload = rejectShotScriptRequestSchema.parse(request.body);
  return services.rejectShotScript.execute({ projectId: params.projectId, ...payload });
});
```

- [ ] **Step 4: Re-run the targeted API test**

Run: `corepack pnpm --filter @sweet-star/api test -- shot-script-api.test.ts`

Expected: PASS with generate/current/review/save/approve/reject routes backed by real use cases.

- [ ] **Step 5: Commit the API shot-script surface**

```bash
git add apps/api/src apps/api/tests
git commit -m "feat: add shot script api routes"
```

### Task 8: Wire the worker and add end-to-end backend flow tests

**Files:**
- Modify: `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
- Modify: `apps/worker/src/index.ts`
- Create: `apps/worker/tests/shot-script-worker.integration.test.ts`
- Create: `apps/api/tests/spec6-shot-script-flow.integration.test.ts`

- [ ] **Step 1: Write the failing worker and end-to-end integration tests**

```ts
expect(workerFactory).toHaveBeenCalledWith(
  expect.objectContaining({ queueName: "shot-script-generate" }),
);

expect(project.status).toBe("shot_script_in_review");
expect(project.currentShotScript?.shotCount).toBe(3);

expect(reviewPayload.latestReview?.action).toBe("reject");
expect(regeneratedTask.type).toBe("shot_script_generate");
```

- [ ] **Step 2: Run the targeted integration tests**

Run: `corepack pnpm --filter @sweet-star/worker test -- shot-script-worker.integration.test.ts`

Run: `corepack pnpm --filter @sweet-star/api test -- spec6-shot-script-flow.integration.test.ts`

Expected: FAIL because the worker bootstrap does not construct or run a shot-script processor and the end-to-end flow cannot enter the new phase.

- [ ] **Step 3: Wire the worker bootstrap and queue registration**

```ts
{
  queueName: shotScriptGenerateQueueName,
  processor: async (job: WorkerJob) => {
    await services.processShotScriptGenerateTask.execute({
      taskId: job.data.taskId,
    });
  },
}
```

- [ ] **Step 4: Re-run the targeted integration tests**

Run: `corepack pnpm --filter @sweet-star/worker test -- shot-script-worker.integration.test.ts`

Run: `corepack pnpm --filter @sweet-star/api test -- spec6-shot-script-flow.integration.test.ts`

Expected: PASS with end-to-end generation, review save/approve, and reject/regenerate paths working through API, worker, SQLite, and disk.

- [ ] **Step 5: Commit the worker and end-to-end flow**

```bash
git add apps/worker/src apps/worker/tests apps/api/tests
git commit -m "feat: add shot script worker flow"
```

## Chunk 5: Verification

### Task 9: Run focused verification for the touched packages

**Files:**
- No code changes expected

- [ ] **Step 1: Run the shared verification suite**

Run: `corepack pnpm --filter @sweet-star/shared test -- shot-script-api-schema.test.ts project-api-schema.test.ts task-api-schema.test.ts`

Expected: PASS with shot-script schemas and project payload coverage green.

- [ ] **Step 2: Run the core verification suite**

Run: `corepack pnpm --filter @sweet-star/core test -- create-shot-script-generate-task.test.ts process-shot-script-generate-task.test.ts get-current-shot-script.test.ts get-shot-script-review.test.ts save-human-shot-script.test.ts approve-shot-script.test.ts reject-shot-script.test.ts get-project-detail.test.ts list-projects.test.ts`

Expected: PASS with shot-script task, processing, and review flows green.

- [ ] **Step 3: Run the services verification suite**

Run: `corepack pnpm --filter @sweet-star/services test -- shot-script-storage.test.ts default-shot-script-prompt-template.test.ts gemini-shot-script-provider.test.ts sqlite-shot-script-review-repository.test.ts sqlite-project-repository.test.ts sqlite-task-repository.test.ts`

Expected: PASS with storage, repository, and provider coverage green.

- [ ] **Step 4: Run the API and worker verification suites**

Run: `corepack pnpm --filter @sweet-star/api test -- shot-script-api.test.ts spec6-shot-script-flow.integration.test.ts`

Run: `corepack pnpm --filter @sweet-star/worker test -- shot-script-worker.integration.test.ts`

Expected: PASS with the end-to-end backend flow green.

### Task 10: Run full-repo verification and capture completion evidence

**Files:**
- No code changes expected

- [ ] **Step 1: Run the full monorepo test suite**

Run: `corepack pnpm test`

Expected: PASS with no regressions in earlier phases.

- [ ] **Step 2: Run the full monorepo typecheck**

Run: `corepack pnpm typecheck`

Expected: PASS with all new shot-script types wired correctly across packages.

- [ ] **Step 3: Review the final diff**

Run:

```bash
git diff -- packages/shared/src packages/shared/tests
git diff -- packages/core/src packages/core/tests
git diff -- packages/services/src packages/services/tests
git diff -- apps/api/src apps/api/tests
git diff -- apps/worker/src apps/worker/tests
```

Expected: the diff contains only the approved shot-script backend work and incidental test updates required by those changes.

- [ ] **Step 4: Run `@superpowers/verification-before-completion` before reporting success**

Required evidence to capture in execution notes:
- focused package test output
- full `corepack pnpm test` output
- full `corepack pnpm typecheck` output
- any intentional deviations from the spec or plan
