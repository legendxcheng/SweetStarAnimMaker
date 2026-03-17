# Spec1 Local Project And Asset Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Node-based local backend foundation for Spec1 so projects can be created, indexed in SQLite, stored on disk, queried over HTTP, and have their original scripts overwritten safely.

**Architecture:** Add a dedicated `apps/api` service inside the existing `pnpm` monorepo. Keep business rules in `packages/core`, place SQLite and filesystem adapters in `packages/services`, keep DTOs and schemas in `packages/shared`, and expose only the three Spec1 endpoints through a thin HTTP layer.

**Tech Stack:** `pnpm` workspaces, TypeScript, Fastify, Zod, Better SQLite 3, Vitest

---

## Chunk 1: Backend Workspace Bootstrap

### Task 1: Add the API app and backend package wiring

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/services/package.json`
- Create: `packages/services/tsconfig.json`
- Create: `packages/services/src/index.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing workspace smoke test**

Create `apps/api/src/index.ts` with a placeholder export and add a Vitest smoke test at `apps/api/tests/unit/workspace-smoke.test.ts` that imports the API entrypoint.

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("api workspace bootstrap", () => {
  it("creates the Fastify app", () => {
    expect(buildApp).toBeTypeOf("function");
  });
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run:

```bash
pnpm --filter @sweet-star/api test
```

Expected: fail because `apps/api` package metadata, test runner wiring, or `buildApp` do not exist yet.

- [ ] **Step 3: Add workspace package manifests and root scripts**

Update the root `package.json` with workspace-safe scripts:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  }
}
```

Add backend package manifests with initial dependencies:

- `apps/api`: `fastify`, `zod`, `tsx`, `vitest`, `typescript`
- `packages/shared`: `zod`, `typescript`
- `packages/core`: `typescript`
- `packages/services`: `better-sqlite3`, `typescript`

Add `.local-data/`, `.worktrees/`, and `worktrees/` to `.gitignore`.

- [ ] **Step 4: Implement the minimal app bootstrap**

Create `apps/api/src/app.ts` with:

```ts
import Fastify from "fastify";

export function buildApp() {
  return Fastify();
}
```

Create `apps/api/src/index.ts` that starts the server later, but for now only exports `buildApp`.

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @sweet-star/api test
pnpm --filter @sweet-star/api typecheck
```

Expected: both pass for the bootstrap package.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore apps/api packages/core packages/services packages/shared
git commit -m "chore: bootstrap spec1 backend workspace"
```

## Chunk 2: Shared Contracts And Core Use Cases

### Task 2: Define shared DTOs and project domain contracts

**Files:**
- Create: `packages/shared/src/constants/project-status.ts`
- Create: `packages/shared/src/schemas/project-api.ts`
- Create: `packages/shared/src/types/project-detail.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/core/src/domain/project.ts`
- Create: `packages/core/src/domain/project-script.ts`
- Create: `packages/core/src/errors/project-errors.ts`
- Create: `packages/core/src/ports/project-repository.ts`
- Create: `packages/core/src/ports/script-storage.ts`
- Create: `packages/core/src/ports/id-generator.ts`
- Create: `packages/core/src/ports/clock.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing unit tests for the contracts**

Create:

- `packages/shared/tests/project-api-schema.test.ts`
- `packages/core/tests/project-domain.test.ts`

Use tests like:

```ts
it("accepts a valid create-project payload", () => {
  const parsed = createProjectRequestSchema.parse({
    name: "My Story",
    script: "Scene 1"
  });

  expect(parsed.name).toBe("My Story");
});
```

```ts
it("creates a storage directory name from project id and slug", () => {
  const project = createProjectRecord({
    id: "proj_20260317_ab12cd",
    name: "My Story",
    slug: "my-story"
  });

  expect(project.storageDir).toBe("projects/proj_20260317_ab12cd-my-story");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
pnpm --filter @sweet-star/shared test
pnpm --filter @sweet-star/core test
```

Expected: fail because schemas, types, and domain factories do not exist yet.

- [ ] **Step 3: Implement the shared API schemas**

Define:

- request schemas for `POST /projects` and `PUT /projects/:projectId/script`
- response schema for project detail
- a shared `ProjectStatus` constant with initial value `script_ready`

- [ ] **Step 4: Implement the project domain model and ports**

Add:

- a `ProjectRecord` type that matches the SQLite row shape
- helpers that derive `storageDir` and `scriptRelPath`
- repository and script storage ports
- explicit domain errors for validation and missing projects

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm --filter @sweet-star/shared test
pnpm --filter @sweet-star/core test
pnpm --filter @sweet-star/shared typecheck
pnpm --filter @sweet-star/core typecheck
```

Expected: all contract tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared packages/core
git commit -m "feat: add spec1 project contracts"
```

### Task 3: Implement the core Spec1 use cases with compensating behavior

**Files:**
- Create: `packages/core/src/use-cases/create-project.ts`
- Create: `packages/core/src/use-cases/get-project-detail.ts`
- Create: `packages/core/src/use-cases/update-project-script.ts`
- Create: `packages/core/src/use-cases/project-detail-dto.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/create-project.test.ts`
- Create: `packages/core/tests/get-project-detail.test.ts`
- Create: `packages/core/tests/update-project-script.test.ts`

- [ ] **Step 1: Write failing use-case tests**

Cover:

- project creation returns the expected detail DTO
- create flow rolls back file writes when repository insert fails
- script update rewrites metadata and timestamps
- querying a missing project throws a not-found error

Example:

```ts
it("removes the script file when repository insert fails", async () => {
  const scriptStorage = createFakeScriptStorage();
  const repository = createFailingProjectRepository();
  const useCase = createCreateProjectUseCase({ repository, scriptStorage, idGenerator, clock });

  await expect(useCase.execute({ name: "My Story", script: "Scene 1" })).rejects.toThrow();
  expect(scriptStorage.deleteScript).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the use-case tests to verify they fail**

Run:

```bash
pnpm --filter @sweet-star/core test -- create-project
pnpm --filter @sweet-star/core test -- get-project-detail
pnpm --filter @sweet-star/core test -- update-project-script
```

Expected: fail because the use cases do not exist yet.

- [ ] **Step 3: Implement create, read, and update use cases**

Rules to encode:

- reject empty name and empty script
- allow duplicate display names
- write script metadata through the storage port
- keep SQLite and filesystem in sync with compensating cleanup on failure
- return a shared project detail DTO shape

- [ ] **Step 4: Run the full core test suite**

Run:

```bash
pnpm --filter @sweet-star/core test
pnpm --filter @sweet-star/core typecheck
```

Expected: all core domain and use-case tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: implement spec1 project use cases"
```

## Chunk 3: SQLite And Filesystem Adapters

### Task 4: Implement the `.local-data` path policy and script filesystem adapter

**Files:**
- Create: `packages/services/src/storage/local-data-paths.ts`
- Create: `packages/services/src/storage/file-script-storage.ts`
- Create: `packages/services/src/storage/fs-utils.ts`
- Create: `packages/services/tests/local-data-paths.test.ts`
- Create: `packages/services/tests/file-script-storage.test.ts`
- Modify: `packages/services/src/index.ts`

- [ ] **Step 1: Write failing tests for storage paths and script persistence**

Cover:

- `.local-data/sqlite/app.db` path resolution
- `.local-data/projects/<projectId-slug>/script/original.txt` path resolution
- script write creates the containing directories
- script overwrite updates byte size and preserves the same logical path

- [ ] **Step 2: Run the storage tests to verify they fail**

Run:

```bash
pnpm --filter @sweet-star/services test -- local-data-paths
pnpm --filter @sweet-star/services test -- file-script-storage
```

Expected: fail because the path builder and filesystem adapter do not exist yet.

- [ ] **Step 3: Implement the storage path builder and script adapter**

Implement:

- deterministic path helpers rooted at `.local-data`
- `writeOriginalScript`
- `readScriptMetadata`
- `deleteOriginalScript`
- overwrite-safe updates for `PUT /projects/:projectId/script`

Use temporary test directories for tests instead of the real repository `.local-data`.

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm --filter @sweet-star/services test -- file-script-storage
pnpm --filter @sweet-star/services typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/services
git commit -m "feat: add spec1 filesystem storage adapter"
```

### Task 5: Implement the SQLite repository and database bootstrap

**Files:**
- Create: `packages/services/src/project-repository/sqlite-schema.ts`
- Create: `packages/services/src/project-repository/sqlite-db.ts`
- Create: `packages/services/src/project-repository/sqlite-project-repository.ts`
- Create: `packages/services/tests/sqlite-project-repository.test.ts`
- Modify: `packages/services/src/index.ts`

- [ ] **Step 1: Write failing repository tests**

Cover:

- schema initialization creates the `projects` table
- insert persists the expected metadata fields
- `findById` returns the indexed project
- update script metadata persists `script_bytes`, `script_updated_at`, and `updated_at`

- [ ] **Step 2: Run the repository tests to verify they fail**

Run:

```bash
pnpm --filter @sweet-star/services test -- sqlite-project-repository
```

Expected: fail because the database bootstrap and repository do not exist yet.

- [ ] **Step 3: Implement SQLite schema setup and repository methods**

Include:

- opening `.local-data/sqlite/app.db`
- idempotent schema creation on startup
- project insert
- project lookup by id
- project metadata update for script overwrites

- [ ] **Step 4: Run the services test suite**

Run:

```bash
pnpm --filter @sweet-star/services test
pnpm --filter @sweet-star/services typecheck
```

Expected: all adapter tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/services
git commit -m "feat: add spec1 sqlite project repository"
```

## Chunk 4: HTTP API Wiring

### Task 6: Wire use cases into Fastify routes

**Files:**
- Create: `apps/api/src/bootstrap/build-spec1-services.ts`
- Create: `apps/api/src/http/register-project-routes.ts`
- Create: `apps/api/src/http/error-handler.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/tests/projects-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Use Fastify injection tests to cover:

- `POST /projects` returns `201` and project detail
- `GET /projects/:projectId` returns `200` or `404`
- `PUT /projects/:projectId/script` returns `200`, `400`, or `404`

Example:

```ts
it("creates a project and returns script metadata", async () => {
  const app = buildApp({ dataRoot: tempDir });

  const response = await app.inject({
    method: "POST",
    url: "/projects",
    payload: { name: "My Story", script: "Scene 1" }
  });

  expect(response.statusCode).toBe(201);
});
```

- [ ] **Step 2: Run the API tests to verify they fail**

Run:

```bash
pnpm --filter @sweet-star/api test -- projects-api
```

Expected: fail because route registration and service wiring do not exist yet.

- [ ] **Step 3: Implement route registration and error mapping**

The HTTP layer should:

- validate payloads with shared schemas
- call core use cases only through assembled dependencies
- map domain validation errors to `400`
- map missing projects to `404`
- return `500` for unexpected failures

- [ ] **Step 4: Add the runnable server entrypoint**

`apps/api/src/index.ts` should:

- build the app
- initialize the SQLite schema and filesystem dependencies
- listen on a local port for manual verification

- [ ] **Step 5: Run API tests and a manual smoke check**

Run:

```bash
pnpm --filter @sweet-star/api test
pnpm --filter @sweet-star/api typecheck
pnpm --filter @sweet-star/api dev
```

Expected:

- automated API tests pass
- the local server starts without schema or path errors

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat: expose spec1 project api"
```

## Chunk 5: End-To-End Verification

### Task 7: Add integration tests across SQLite, disk, and HTTP

**Files:**
- Create: `apps/api/tests/spec1-project-flow.integration.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing end-to-end integration test**

Cover one full flow:

1. create a project through HTTP
2. assert the SQLite row exists
3. assert `.local-data/projects/<projectId-slug>/script/original.txt` exists
4. overwrite the script through HTTP
5. assert file contents and metadata changed
6. query the project detail and verify the returned metadata

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
pnpm --filter @sweet-star/api test -- spec1-project-flow
```

Expected: fail until the full dependency chain is in place.

- [ ] **Step 3: Implement any missing integration glue**

Fix only the missing seams exposed by the end-to-end test. Avoid introducing Spec2 concepts such as tasks, queueing, or storyboard files.

- [ ] **Step 4: Document how to run the API locally**

Update `README.md` with:

- install command
- API dev command
- test command
- note that local state is written under `.local-data/`

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
pnpm install
pnpm test
pnpm typecheck
```

Expected:

- all workspace tests pass
- all typechecks pass
- `.local-data/` remains ignored by git

- [ ] **Step 6: Commit**

```bash
git add apps/api README.md
git commit -m "test: verify spec1 local project flow"
```
