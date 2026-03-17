# Spec2 Pipeline Task Skeleton Design

## Context

`docs/prd/Overall.md` still describes a Python/FastAPI direction, but the current repository already runs as a Node/TypeScript `pnpm` monorepo with `apps/*` and `packages/*`. Spec2 should therefore extend the existing Spec1 backend foundation instead of introducing a parallel Python runtime.

`docs/prd/MVP-Specs.md` defines Spec2 as the asynchronous execution backbone for storyboard generation tasks. The delivery must validate task persistence, Redis-backed queueing, a separate worker process, task file layout, and queryable task state without pulling in real LLM calls, storyboard parsing, or review workflow.

Spec1 already established:

- project metadata persistence in SQLite
- project-local filesystem storage under `.local-data/`
- a Fastify API in `apps/api`
- domain logic in `packages/core`
- adapter implementations in `packages/services`

Spec2 should build directly on those boundaries.

## Goal

Provide a stable asynchronous task foundation that can:

- create a `StoryboardGenerate` task for an existing project
- persist task metadata in SQLite
- write stable task files under the owning project directory
- enqueue the task into Redis through BullMQ
- process the task in a separate worker process
- expose a query API for task status and task file metadata

## Decisions

### 1. Runtime Shape

Spec2 keeps the existing monorepo shape and adds a dedicated worker app:

- `apps/api`: task creation and query API
- `apps/worker`: BullMQ consumer process
- `packages/shared`: task constants, schemas, DTOs
- `packages/core`: task domain rules, ports, and use cases
- `packages/services`: SQLite task repository, task filesystem storage, BullMQ adapter

The API process must not consume jobs itself. The worker must run as a separate process so Spec2 actually validates the asynchronous execution boundary that later specs depend on.

### 2. Queue Choice

Use BullMQ backed by Redis.

BullMQ fits the existing Node stack, provides a stable producer/worker model, supports stable job IDs, and does not force the project to invent queue semantics that are outside the MVP scope.

SQLite remains the system of record for externally queried task state. Redis exists to drive execution, not to become the public state source.

### 3. Task Scope

Spec2 includes only one task type:

- `StoryboardGenerate`

Spec2 excludes:

- real provider calls
- storyboard parsing
- storyboard version persistence
- review actions
- image, video, or merge tasks

This keeps the task model narrow enough to validate orchestration before adding provider complexity in Spec3.

### 4. Task Status Scope

Spec2 uses the minimum execution state machine:

- `pending`
- `running`
- `succeeded`
- `failed`

States such as `generated`, `reviewing`, `approved`, and `rejected` are intentionally excluded. Those belong to later specs that introduce business workflow beyond queue execution.

### 5. API Scope

Only these task endpoints are in scope:

- `POST /projects/:projectId/tasks/storyboard-generate`
- `GET /tasks/:taskId`

Spec2 does not need list endpoints, cancellation, retries from the API, or cross-project task dashboards.

### 6. Input And Output Contract

The API creates task metadata and a stable `input.json` before enqueueing. The worker reads that input file and writes task results back to disk.

This separates:

- API responsibility: validate, persist, enqueue
- worker responsibility: consume, execute, record output

That file contract becomes the stable seam that Spec3 can later reuse when the placeholder execution is replaced by a real LLM integration.

## Data Model

Spec2 adds a `tasks` table to SQLite.

Recommended fields:

- `id`: stable task ID such as `task_20260317_ab12cd`
- `project_id`: owning project ID
- `type`: `storyboard_generate`
- `status`: `pending`, `running`, `succeeded`, or `failed`
- `queue_name`: queue identifier such as `storyboard-generate`
- `storage_dir`: relative task directory such as `projects/<projectId-slug>/tasks/<taskId>`
- `input_rel_path`: relative file path such as `tasks/<taskId>/input.json`
- `output_rel_path`: relative file path such as `tasks/<taskId>/output.json`
- `log_rel_path`: relative file path such as `tasks/<taskId>/log.txt`
- `error_message`: nullable failure summary
- `created_at`
- `updated_at`
- `started_at`
- `finished_at`

SQLite stores lookup, lifecycle, and query metadata only. It does not store the full task input, output, or logs inline.

## Filesystem Contract

Spec2 extends the existing per-project storage layout:

```text
.local-data/
  sqlite/
    app.db
  projects/
    <projectId-slug>/
      script/
        original.txt
      tasks/
        <taskId>/
          input.json
          output.json
          log.txt
```

Rules:

- the API creates the task directory when the task is created
- the API writes `input.json` before enqueueing
- the worker appends to `log.txt` during execution
- the worker writes `output.json` only on success
- failed tasks may omit `output.json`, but must record failure details in SQLite and logs

Task files live under the project directory so all artifacts for one project remain co-located.

## API Contract

### `POST /projects/:projectId/tasks/storyboard-generate`

Behavior:

- validate that the project exists
- generate a `taskId`
- build the task input from stable project metadata
- insert the `pending` task row in SQLite
- create the task directory
- write `input.json`
- enqueue a BullMQ job using `taskId` as the stable job ID

The input payload should include only the minimum data required to execute the placeholder storyboard task, for example:

- `taskId`
- `projectId`
- `taskType`
- `scriptPath`
- `scriptUpdatedAt`

Success response should include:

- task summary
- current status
- created timestamps
- task file metadata

If the project is missing, return `404`.

If request validation fails, return `400`.

### `GET /tasks/:taskId`

Behavior:

- load the task record from SQLite
- return task summary and lifecycle timestamps
- return task file metadata

The response should not proxy Redis state directly. Redis is internal infrastructure; the public task state comes from SQLite.

Missing tasks return `404`.

## Worker Contract

The worker process runs independently from the API and consumes the BullMQ queue for `StoryboardGenerate`.

Recommended execution flow:

1. consume the job using `taskId` as the job identifier
2. transition the SQLite row from `pending` to `running`
3. set `started_at`
4. read `input.json`
5. execute a placeholder storyboard generation handler
6. write `output.json`
7. append execution details to `log.txt`
8. transition the task to `succeeded` and set `finished_at`

On error:

1. append failure details to `log.txt`
2. transition the task to `failed`
3. set `error_message`
4. set `finished_at`

The placeholder handler should return deterministic structured output that proves the pipeline works without introducing provider-specific behavior into Spec2.

## Error Handling Rules

Spec2 must explicitly guard against partial task creation and partial execution state.

Required rules:

- unknown `projectId` returns `404`
- unknown `taskId` returns `404`
- invalid request payload returns `400`
- if SQLite insert succeeds but task directory creation or `input.json` write fails, compensating cleanup must remove the partial task record
- if SQLite insert and file creation succeed but Redis enqueue fails, the task must not remain silently `pending`
- worker failures must be reflected in SQLite and logs
- task query must keep working even if Redis is temporarily unavailable, because it reads from SQLite

Spec2 does not need user-triggered retry semantics yet. It only needs truthful state transitions and durable failure evidence.

## Windows Development Environment

Spec1 already runs cleanly on Windows because the current backend stack is Node/TypeScript, Fastify, and Better SQLite 3.

Spec2 remains Windows-compatible, including the backend, with one explicit environment caveat: Redis must be supplied by a Windows-friendly runtime.

Recommended development options on Windows:

1. Docker running Redis
2. Memurai as a Windows-compatible Redis implementation

Do not treat a native Windows Redis Open Source install as the default project path. The repository documentation should explicitly call out the supported Redis setup expectation for local development.

## Testing Strategy

Spec2 should be verified through unit, integration, and API/worker tests.

### Unit Tests

- task status constants and schema validation
- task path construction
- DTO mapping for task detail responses
- task creation and lifecycle use-case behavior

### Integration Tests

- creating a task writes both the SQLite row and `input.json`
- queue submission uses the expected task ID and queue name
- worker execution writes `output.json` and `log.txt`
- failure during task creation does not leave partial SQLite rows or directories
- failure during worker execution updates SQLite to `failed`

### API And Worker Tests

- `POST /projects/:projectId/tasks/storyboard-generate` success and validation failure
- `GET /tasks/:taskId` success and `404`
- end-to-end flow where the API creates a task and a separate worker consumes it

The end-to-end test should prove the observable state sequence:

- task created as `pending`
- worker marks task `running`
- worker finishes as `succeeded` or `failed`

## Out Of Scope

Spec2 does not include:

- real LLM provider integration
- storyboard parsing into domain scenes
- storyboard version indexing
- review actions and project review states
- image generation
- video generation
- merge/export workflow
- browser UI

## Completion Definition

Spec2 is complete when:

- a `StoryboardGenerate` task can be created from the API
- SQLite stores the task record with durable lifecycle timestamps
- the task directory is created under the owning project
- `input.json` is written before queue submission
- a separate worker process can consume the queued task
- task status transitions through `pending -> running -> succeeded` or `failed`
- task outputs such as `output.json` and `log.txt` are written
- the API can query task state without consulting Redis directly
- automated tests prove task persistence, queueing, worker execution, and failure handling stay consistent
