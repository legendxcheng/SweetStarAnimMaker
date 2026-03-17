# Spec1 Local Project And Asset Foundation Design

## Context

`docs/prd/Overall.md` describes a Python/FastAPI direction, but the current repository is already a `pnpm` monorepo scaffold with `apps/*` and `packages/*`. Spec1 should therefore align with the existing workspace and establish the first Node-based backend foundation instead of introducing a parallel Python stack.

`docs/prd/MVP-Specs.md` defines Spec1 as the storage baseline for all later work. The delivery must lock down the local project model, SQLite index storage, local file persistence for scripts, and a queryable project detail API without pulling in queueing, AI, or storyboard generation.

## Goal

Provide a minimal but stable local backend foundation that can:

- create a project from a name and raw script
- persist project metadata in SQLite
- write the original script to local disk
- expose a local HTTP API for create, read, and script update
- define a stable directory contract that later specs can build on

## Decisions

### 1. Runtime Shape

Use a dedicated Node backend app in `apps/api`.

The repository remains a `pnpm` monorepo:

- `apps/api`: local HTTP API for Spec1
- `apps/studio`: future browser UI, untouched in Spec1
- `packages/core`: domain models, ports, and use cases
- `packages/services`: SQLite and filesystem implementations
- `packages/shared`: shared schemas, DTOs, constants

This keeps the backend isolated from the future browser UI and preserves clean boundaries for later worker and provider work.

### 2. API Scope

Spec1 includes both the service layer and the minimum HTTP layer.

Only these endpoints are in scope:

- `POST /projects`
- `GET /projects/:projectId`
- `PUT /projects/:projectId/script`

Anything related to tasks, storyboards, AI calls, review workflow, or queue management is explicitly out of scope.

### 3. Storage Root

Use a repository-local storage root:

```text
.local-data/
```

This keeps early development simple, makes test fixtures predictable, and avoids premature operating-system-specific app data handling.

### 4. Project Directory Naming

Each project directory uses `projectId-slug`.

Example:

```text
.local-data/projects/proj_20260317_ab12cd-my-first-story/
```

This keeps the directory stable, unique, and still readable to humans.

### 5. Script Lifecycle

Spec1 supports:

- create with initial script content
- overwrite the current original script later

Spec1 does not include script version history.

## Data Model

Spec1 defines a single `projects` index table in SQLite.

Recommended fields:

- `id`: stable project ID such as `proj_20260317_ab12cd`
- `name`: original project name from user input
- `slug`: normalized filesystem-safe slug
- `storage_dir`: relative project directory such as `projects/proj_20260317_ab12cd-my-first-story`
- `script_rel_path`: relative script path such as `script/original.txt`
- `script_bytes`: current script size in bytes
- `status`: initial project status, for example `script_ready`
- `created_at`
- `updated_at`
- `script_updated_at`

SQLite stores metadata and lookup information only. The raw script body lives on disk, not in the database.

## Filesystem Contract

The stable storage layout is:

```text
.local-data/
  sqlite/
    app.db
  projects/
    <projectId-slug>/
      script/
        original.txt
```

Spec1 should create only what it actively uses. `storyboards/`, `tasks/`, and other future directories should not be created yet, because doing so would imply capabilities that do not exist.

## API Contract

### `POST /projects`

Input:

- `name`
- `script`

Behavior:

- validate required fields
- generate `projectId`
- generate normalized `slug`
- create the project directory and `script/original.txt`
- insert the project record into SQLite

Success means both the database record and the script file have been persisted.

Response includes:

- project summary
- script metadata
- project storage directory

### `GET /projects/:projectId`

Behavior:

- load project metadata from SQLite
- return the project summary and script metadata

The response should not return the full script body in Spec1. It returns metadata only:

- script path
- script size
- script updated timestamp

Missing projects return `404`.

### `PUT /projects/:projectId/script`

Input:

- `script`

Behavior:

- validate project existence
- overwrite `script/original.txt`
- update `script_bytes`
- update `script_updated_at`
- update project `updated_at`

Missing projects return `404`.

Empty script content returns `400`.

## Error Handling Rules

The implementation should explicitly guard against index/filesystem drift.

Required rules:

- empty project name returns `400`
- empty script returns `400`
- unknown `projectId` returns `404`
- duplicate display names are allowed because uniqueness is based on `projectId`
- the original project name is preserved even if the slug is normalized
- partial failure must not leave half-created projects behind

The create and update flows should include compensating cleanup so failed writes do not leave mismatched SQLite rows and files on disk.

## Testing Strategy

Spec1 should be verified through unit, integration, and API tests.

### Unit Tests

- project ID generation
- slug normalization
- storage path construction
- DTO mapping for project detail responses

### Integration Tests

- creating a project writes both SQLite metadata and script file
- updating a script changes file content and metadata together
- querying a project returns the expected summary
- failed persistence does not leave dirty partial state

### API Tests

- `POST /projects` success and validation failure
- `GET /projects/:projectId` success and `404`
- `PUT /projects/:projectId/script` success, `400`, and `404`

## Out Of Scope

Spec1 does not include:

- async task queue
- worker process
- Redis
- storyboard generation
- AI provider integration
- review workflow
- browser pages in `apps/studio`

## Completion Definition

Spec1 is complete when:

- a project can be created through the API
- SQLite contains the expected project record
- the repository-local project directory is created under `.local-data/`
- the original script is written to disk
- project detail and script metadata can be queried
- script overwrite updates both disk content and metadata
- automated tests prove database, filesystem, and API behavior stay consistent
