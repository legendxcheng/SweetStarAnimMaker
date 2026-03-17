# Spec2 Pipeline Task Skeleton Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the asynchronous task foundation for storyboard generation so the API can create durable tasks, enqueue them into Redis, and a separate worker can execute them while persisting lifecycle state and task files.

**Architecture:** Extend the current Spec1 Node backend instead of introducing a parallel runtime. Keep task contracts and use cases in `packages/shared` and `packages/core`, place SQLite, filesystem, and BullMQ adapters in `packages/services`, expose task APIs from `apps/api`, and run queue consumption from a new `apps/worker` process that writes task outputs back to the project storage tree.

**Tech Stack:** `pnpm` workspaces, TypeScript, Fastify, Zod, Better SQLite 3, BullMQ, Redis, Vitest

---

## Chunk 1: Shared Task Contracts And Core Use Cases

### Task 1: Define shared task constants, schemas, and DTOs

**Files:**
- Create: `packages/shared/src/constants/task-status.ts`
- Create: `packages/shared/src/constants/task-type.ts`
- Create: `packages/shared/src/schemas/task-api.ts`
- Create: `packages/shared/src/types/task-detail.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/task-api-schema.test.ts`

- [ ] **Step 1: Write the failing shared-contract test**

Create `packages/shared/tests/task-api-schema.test.ts`.

```ts
import { describe, expect, it } from "vitest";
import {
  createStoryboardGenerateTaskResponseSchema,
  taskDetailResponseSchema,
} from "../src/schemas/task-api";

describe("task api schema", () => {
  it("accepts a storyboard task response", () => {
    const parsed = createStoryboardGenerateTaskResponseSchema.parse({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "storyboard_generate",
      status: "pending",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260317_ab12cd/input.json",
        outputPath: "tasks/task_20260317_ab12cd/output.json",
        logPath: "tasks/task_20260317_ab12cd/log.txt",
      },
    });

    expect(parsed.status).toBe("pending");
  });
});
```

- [ ] **Step 2: Run the shared test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/shared test -- task-api-schema`

Expected: FAIL because task constants, DTOs, and schemas do not exist yet.

- [ ] **Step 3: Implement the minimal shared contracts**

Add the task constants, DTO types, and Zod schemas needed for:

- `POST /projects/:projectId/tasks/storyboard-generate`
- `GET /tasks/:taskId`

Use only these status values:

```ts
export const taskStatuses = ["pending", "running", "succeeded", "failed"] as const;
export const taskTypes = ["storyboard_generate"] as const;
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
corepack pnpm --filter @sweet-star/shared test
corepack pnpm --filter @sweet-star/shared typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat: add spec2 task api contracts"
```

### Task 2: Add the task domain model, ports, and API-side use cases

**Files:**
- Create: `packages/core/src/domain/task.ts`
- Create: `packages/core/src/errors/task-errors.ts`
- Create: `packages/core/src/ports/task-repository.ts`
- Create: `packages/core/src/ports/task-file-storage.ts`
- Create: `packages/core/src/ports/task-queue.ts`
- Create: `packages/core/src/ports/task-id-generator.ts`
- Create: `packages/core/src/use-cases/create-storyboard-generate-task.ts`
- Create: `packages/core/src/use-cases/get-task-detail.ts`
- Create: `packages/core/src/use-cases/task-detail-dto.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/task-domain.test.ts`
- Test: `packages/core/tests/create-storyboard-generate-task.test.ts`
- Test: `packages/core/tests/get-task-detail.test.ts`

- [ ] **Step 1: Write the failing core tests**

Create `packages/core/tests/task-domain.test.ts` and `packages/core/tests/create-storyboard-generate-task.test.ts`.

```ts
import { describe, expect, it } from "vitest";
import { createTaskRecord } from "../src/domain/task";

describe("task domain", () => {
  it("derives the task storage directory from project storage", () => {
    const task = createTaskRecord({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
      type: "storyboard_generate",
      queueName: "storyboard-generate",
      createdAt: "2026-03-17T12:00:00.000Z",
    });

    expect(task.storageDir).toBe(
      "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
    );
  });
});
```

- [ ] **Step 2: Run the core tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/core test -- task-domain
corepack pnpm --filter @sweet-star/core test -- create-storyboard-generate-task
```

Expected: FAIL because the task domain and use cases do not exist yet.

- [ ] **Step 3: Implement the minimal core task model**

Add:

- a `TaskRecord` type with SQLite-aligned fields
- helpers for `storageDir`, `inputRelPath`, `outputRelPath`, and `logRelPath`
- a `TaskRepository` port for insert, lookup, and status transitions
- a `TaskFileStorage` port for writing `input.json`, `output.json`, and `log.txt`
- a `TaskQueue` port for enqueueing by `taskId`
- use cases for creating a storyboard task and querying task detail

- [ ] **Step 4: Encode compensating behavior in the create-task use case**

The create-task use case should:

- reject unknown projects through the existing `ProjectRepository`
- insert the `pending` task row
- write `input.json`
- enqueue with a stable job ID
- clean up the partial task row if file creation fails
- mark the task `failed` if enqueueing fails after persistence succeeds

- [ ] **Step 5: Run the full core suite**

Run:

```bash
corepack pnpm --filter @sweet-star/core test
corepack pnpm --filter @sweet-star/core typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat: add spec2 task core use cases"
```

## Chunk 2: SQLite And Filesystem Task Adapters

### Task 3: Extend local storage paths and add task file storage

**Files:**
- Modify: `packages/services/src/storage/local-data-paths.ts`
- Create: `packages/services/src/storage/task-file-storage.ts`
- Modify: `packages/services/src/index.ts`
- Test: `packages/services/tests/local-data-paths.test.ts`
- Test: `packages/services/tests/task-file-storage.test.ts`

- [ ] **Step 1: Write the failing task-storage tests**

Add task path assertions to `packages/services/tests/local-data-paths.test.ts` and create `packages/services/tests/task-file-storage.test.ts`.

```ts
it("builds the task input path inside the owning project", () => {
  const paths = createLocalDataPaths("C:/repo");

  expect(
    paths.projectTaskInputPath(
      "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
    ),
  ).toMatch(/tasks[\\/]+task_20260317_ab12cd[\\/]+input.json$/);
});
```

- [ ] **Step 2: Run the services tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/services test -- local-data-paths
corepack pnpm --filter @sweet-star/services test -- task-file-storage
```

Expected: FAIL because task path helpers and task file storage do not exist yet.

- [ ] **Step 3: Implement the task path helpers and storage adapter**

Add helpers for:

- project task directory
- `input.json`
- `output.json`
- `log.txt`

Implement a task file storage adapter with methods for:

- `createTaskArtifacts`
- `writeTaskOutput`
- `appendTaskLog`

- [ ] **Step 4: Run the services storage tests**

Run:

```bash
corepack pnpm --filter @sweet-star/services test -- task-file-storage
corepack pnpm --filter @sweet-star/services typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/services
git commit -m "feat: add spec2 task file storage"
```

### Task 4: Implement the SQLite task repository and schema bootstrap

**Files:**
- Create: `packages/services/src/task-repository/sqlite-task-schema.ts`
- Create: `packages/services/src/task-repository/sqlite-task-repository.ts`
- Modify: `packages/services/src/project-repository/sqlite-schema.ts`
- Modify: `packages/services/src/index.ts`
- Test: `packages/services/tests/sqlite-task-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

Create `packages/services/tests/sqlite-task-repository.test.ts`.

```ts
import { describe, expect, it } from "vitest";

describe("sqlite task repository", () => {
  it("persists a pending storyboard task", () => {
    expect(true).toBe(false);
  });
});
```

Replace the placeholder with real assertions covering:

- schema initialization creates `tasks`
- insert persists task metadata
- `findById` returns the task
- status transitions update timestamps and error message

- [ ] **Step 2: Run the repository tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/services test -- sqlite-task-repository`

Expected: FAIL because the schema and repository do not exist yet.

- [ ] **Step 3: Implement the SQLite task schema and repository**

Support:

- insert
- lookup by task ID
- update to `running`
- update to `succeeded`
- update to `failed`

Wire the task schema into the existing SQLite initialization path so Spec1 and Spec2 share the same database file.

- [ ] **Step 4: Run the full services suite**

Run:

```bash
corepack pnpm --filter @sweet-star/services test
corepack pnpm --filter @sweet-star/services typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/services
git commit -m "feat: add spec2 sqlite task repository"
```

## Chunk 3: Queue Adapter And Worker Process

### Task 5: Add BullMQ queue wiring and the worker app scaffold

**Files:**
- Modify: `package.json`
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/src/index.ts`
- Create: `packages/services/src/queue/bullmq-task-queue.ts`
- Modify: `packages/services/package.json`
- Modify: `packages/services/src/index.ts`
- Test: `apps/worker/tests/worker-smoke.test.ts`
- Test: `packages/services/tests/bullmq-task-queue.test.ts`

- [ ] **Step 1: Write the failing queue and worker smoke tests**

Create `apps/worker/tests/worker-smoke.test.ts`.

```ts
import { describe, expect, it } from "vitest";
import { startWorker } from "../src/index";

describe("worker bootstrap", () => {
  it("exports a startWorker function", () => {
    expect(startWorker).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run the worker and queue tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/worker test
corepack pnpm --filter @sweet-star/services test -- bullmq-task-queue
```

Expected: FAIL because the worker package and BullMQ adapter do not exist yet.

- [ ] **Step 3: Add the worker workspace and BullMQ dependency wiring**

Update package manifests so:

- `packages/services` depends on `bullmq` and `ioredis`
- `apps/worker` depends on `@sweet-star/core`, `@sweet-star/services`, and `@sweet-star/shared`

Expose a `TaskQueue` implementation that enqueues BullMQ jobs with:

```ts
await queue.add("storyboard_generate", { taskId }, { jobId: taskId });
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
corepack pnpm --filter @sweet-star/worker test
corepack pnpm --filter @sweet-star/services typecheck
```

Expected: PASS for the smoke test and typecheck.

- [ ] **Step 5: Commit**

```bash
git add package.json apps/worker packages/services
git commit -m "feat: add spec2 worker workspace and queue adapter"
```

### Task 6: Implement worker execution and placeholder storyboard task handling

**Files:**
- Create: `packages/core/src/use-cases/process-storyboard-generate-task.ts`
- Modify: `packages/core/src/index.ts`
- Create: `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
- Modify: `apps/worker/src/index.ts`
- Test: `packages/core/tests/process-storyboard-generate-task.test.ts`
- Test: `apps/worker/tests/storyboard-worker.integration.test.ts`

- [ ] **Step 1: Write the failing processing tests**

Cover:

- `pending` task transitions to `running`
- successful execution writes placeholder output and marks `succeeded`
- thrown errors mark the task `failed`

Example:

```ts
it("marks the task failed when processing throws", async () => {
  const useCase = createProcessStoryboardGenerateTaskUseCase({
    taskRepository,
    taskFileStorage,
    clock,
    handler: {
      run: async () => {
        throw new Error("boom");
      },
    },
  });

  await expect(useCase.execute({ taskId: "task_20260317_ab12cd" })).rejects.toThrow("boom");
  expect(taskRepository.markFailed).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the processing tests to verify they fail**

Run:

```bash
corepack pnpm --filter @sweet-star/core test -- process-storyboard-generate-task
corepack pnpm --filter @sweet-star/worker test -- storyboard-worker
```

Expected: FAIL because the worker processing use case does not exist yet.

- [ ] **Step 3: Implement the processing use case and worker bootstrap**

The processing flow should:

- load the task record
- mark it `running`
- read `input.json`
- produce deterministic placeholder output
- write `output.json`
- append `log.txt`
- mark `succeeded`

On exceptions:

- append the failure to `log.txt`
- mark `failed`
- preserve the thrown error for BullMQ visibility

- [ ] **Step 4: Run the full worker-related suite**

Run:

```bash
corepack pnpm --filter @sweet-star/core test
corepack pnpm --filter @sweet-star/worker test
corepack pnpm --filter @sweet-star/worker typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core apps/worker
git commit -m "feat: implement spec2 storyboard worker flow"
```

## Chunk 4: API Task Routes And Service Assembly

### Task 7: Wire task creation and query routes into the API

**Files:**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Create: `apps/api/src/http/register-task-routes.ts`
- Modify: `apps/api/src/http/error-handler.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/tests/tasks-api.test.ts`

- [ ] **Step 1: Write the failing API tests**

Create `apps/api/tests/tasks-api.test.ts`.

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("tasks api", () => {
  it("creates a storyboard task for an existing project", async () => {
    const app = buildApp({ dataRoot: "temp/tasks-api" });

    const createProjectResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "My Story", script: "Scene 1" },
    });

    const project = createProjectResponse.json();

    const taskResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });

    expect(taskResponse.statusCode).toBe(201);
  });
});
```

- [ ] **Step 2: Run the API tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/api test -- tasks-api`

Expected: FAIL because task routes and service wiring do not exist yet.

- [ ] **Step 3: Extend service assembly and register task routes**

Add:

- task repository initialization
- task file storage wiring
- BullMQ queue adapter wiring
- task creation and query use cases
- task route registration
- domain error mapping for `404` and truthful `500` handling

Keep the existing project routes unchanged except for sharing the same assembled dependencies.

- [ ] **Step 4: Run the API suite**

Run:

```bash
corepack pnpm --filter @sweet-star/api test
corepack pnpm --filter @sweet-star/api typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: expose spec2 task api"
```

## Chunk 5: End-To-End Verification And Docs

### Task 8: Verify the full API -> Redis -> worker -> SQLite flow and document local setup

**Files:**
- Create: `apps/api/tests/spec2-task-flow.integration.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing end-to-end integration test**

Cover one full flow:

1. create a project through the API
2. create a `StoryboardGenerate` task through the API
3. assert the task row exists in SQLite as `pending`
4. run the worker against the same Redis and data root
5. assert the task reaches `succeeded`
6. assert `input.json`, `output.json`, and `log.txt` exist
7. query the task through `GET /tasks/:taskId`

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/api test -- spec2-task-flow`

Expected: FAIL until the full dependency chain is in place.

- [ ] **Step 3: Implement any missing integration glue**

Fix only the missing seams exposed by the end-to-end flow. Do not add real LLM calls, storyboard parsing, or review-state concepts.

- [ ] **Step 4: Document local development on Windows and macOS/Linux**

Update `README.md` with:

- install command
- API dev command
- worker dev command
- test command
- required `REDIS_URL`
- note that local state lives under `.local-data/`
- note that Windows development should use Docker Redis or Memurai

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm typecheck
```

Expected:

- all workspace tests pass
- all typechecks pass
- task files are written under `.local-data/`
- Redis-backed task execution works end-to-end

- [ ] **Step 6: Commit**

```bash
git add apps/api README.md
git commit -m "test: verify spec2 task pipeline flow"
```
