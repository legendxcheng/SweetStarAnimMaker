# Final Cut Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manual project-level final cut export that concatenates approved shot videos into one MP4 and exposes playback and download in the Studio video phase.

**Architecture:** Add a dedicated `final_cut_generate` task and project-level final cut read model. Reuse the existing task/worker/storage pipeline so ffmpeg runs off-request, writes stable assets under `final-cut/`, and Studio can poll task state plus fetch one stable playback resource.

**Tech Stack:** TypeScript, Fastify, React, Vitest, Better SQLite, local filesystem storage, ffmpeg CLI

---

## File Structure

- Modify: `packages/shared/src/types/video.ts`
  Add final cut DTO types used by API and Studio.
- Modify: `packages/shared/src/schemas/video-api.ts`
  Add request and response schemas for final cut routes.
- Modify: `packages/shared/src/index.ts`
  Re-export final cut types and schemas.
- Modify: `packages/core/src/domain/task.ts`
  Add a `final_cut_generate` task type and queue name.
- Modify: `packages/core/src/domain/video.ts`
  Add project-level final cut record helpers and storage path builders.
- Modify: `packages/core/src/errors/video-errors.ts`
  Add final cut-specific domain errors for gating and missing state.
- Modify: `packages/core/src/ports/video-repository.ts`
  Add persistence methods for current final cut reads/writes.
- Modify: `packages/core/src/ports/video-storage.ts`
  Add final cut manifest and asset write/read helpers.
- Create: `packages/core/src/use-cases/create-final-cut-generate-task.ts`
  Create and enqueue the export task after gate validation.
- Create: `packages/core/src/use-cases/process-final-cut-generate-task.ts`
  Build the concat manifest, invoke ffmpeg, and persist output.
- Create: `packages/core/src/use-cases/get-final-cut.ts`
  Return typed final cut state for Studio.
- Modify: `packages/core/src/index.ts`
  Export new use cases and types.
- Modify: `packages/core/src/exports/use-cases.ts`
  Re-export new use cases.
- Modify: `packages/services/src/video-repository/sqlite-video-schema.ts`
  Add table definitions for final cuts.
- Modify: `packages/services/src/video-repository/sqlite-video-repository.ts`
  Implement final cut repository methods.
- Modify: `packages/services/src/storage/video-storage.ts`
  Implement manifest writes, final MP4 writes, and JSON record writes.
- Modify: `packages/services/src/index.ts`
  Export any new storage/service helpers.
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
  Wire the new use cases into app services and worker dispatch.
- Modify: `apps/api/src/http/register-video-routes.ts`
  Add final cut create/read routes.
- Modify: `apps/api/tests/video-api.test.ts`
  Cover final cut API behavior.
- Modify: `packages/core/tests/create-videos-generate-task.test.ts`
  Keep adjacent task-domain coverage aligned if needed.
- Create: `packages/core/tests/create-final-cut-generate-task.test.ts`
  Cover trigger and gate validation.
- Create: `packages/core/tests/get-final-cut.test.ts`
  Cover typed empty/success responses.
- Create: `packages/core/tests/process-final-cut-generate-task.test.ts`
  Cover ordering, manifest generation, and persistence.
- Modify: `packages/services/tests/video-storage.test.ts`
  Cover final cut asset writes.
- Modify: `packages/services/tests/sqlite-video-repository.test.ts`
  Cover final cut persistence.
- Modify: `apps/studio/src/services/api-client.ts`
  Add final cut API calls.
- Modify: `apps/studio/src/components/video-phase-panel.tsx`
  Add final cut action area, player, and download button.
- Modify: `apps/studio/tests/integration/api-client.test.ts`
  Cover final cut client requests.
- Modify: `apps/studio/tests/integration/video-phase-panel.test.tsx`
  Cover button gating, generation, playback, and download UI.

## Chunk 1: Shared Contracts And Domain Plumbing

### Task 1: Add failing shared schema tests for final cut types

**Files:**
- Modify: `packages/shared/tests/video-api-schema.test.ts`
- Test: `packages/shared/tests/video-api-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
expect(finalCutResponseSchema.parse({
  currentFinalCut: {
    id: "final_cut_1",
    sourceVideoBatchId: "video_batch_1",
    status: "ready",
    videoAssetPath: "final-cut/current.mp4",
    shotCount: 3,
    updatedAt: "2026-03-31T00:00:00.000Z",
    errorMessage: null,
  },
})).toBeTruthy();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sweet-star/shared test -- --run packages/shared/tests/video-api-schema.test.ts`
Expected: FAIL because final cut schemas do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add final cut DTOs and zod schemas in shared video contracts and re-export them.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sweet-star/shared test -- --run packages/shared/tests/video-api-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/video.ts packages/shared/src/schemas/video-api.ts packages/shared/src/index.ts packages/shared/tests/video-api-schema.test.ts
git commit -m "feat: add final cut shared contracts"
```

### Task 2: Add failing core tests for final cut task/domain behavior

**Files:**
- Modify: `packages/core/src/domain/task.ts`
- Modify: `packages/core/src/domain/video.ts`
- Modify: `packages/core/src/errors/video-errors.ts`
- Modify: `packages/core/src/ports/video-repository.ts`
- Modify: `packages/core/src/ports/video-storage.ts`
- Create: `packages/core/tests/create-final-cut-generate-task.test.ts`
- Create: `packages/core/tests/get-final-cut.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("rejects final cut generation when any shot is not approved", async () => {
  await expect(useCase.execute({ projectId: "project_1" })).rejects.toThrow(
    "All shot videos must be approved before generating the final cut",
  );
});

it("returns an empty final cut response when no final cut exists", async () => {
  expect(await useCase.execute({ projectId: "project_1" })).toEqual({
    currentFinalCut: null,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sweet-star/core test -- --run packages/core/tests/create-final-cut-generate-task.test.ts packages/core/tests/get-final-cut.test.ts`
Expected: FAIL because the use cases and contracts do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add task/domain constants, final cut errors, and new use cases with only enough behavior to satisfy these tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sweet-star/core test -- --run packages/core/tests/create-final-cut-generate-task.test.ts packages/core/tests/get-final-cut.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/task.ts packages/core/src/domain/video.ts packages/core/src/errors/video-errors.ts packages/core/src/ports/video-repository.ts packages/core/src/ports/video-storage.ts packages/core/src/use-cases/create-final-cut-generate-task.ts packages/core/src/use-cases/get-final-cut.ts packages/core/src/index.ts packages/core/src/exports/use-cases.ts packages/core/tests/create-final-cut-generate-task.test.ts packages/core/tests/get-final-cut.test.ts
git commit -m "feat: add final cut core use cases"
```

## Chunk 2: Persistence, Storage, And Worker Execution

### Task 3: Add failing repository and storage tests

**Files:**
- Modify: `packages/services/tests/sqlite-video-repository.test.ts`
- Modify: `packages/services/tests/video-storage.test.ts`
- Modify: `packages/services/src/video-repository/sqlite-video-schema.ts`
- Modify: `packages/services/src/video-repository/sqlite-video-repository.ts`
- Modify: `packages/services/src/storage/video-storage.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("stores and reads the current final cut record", async () => {
  await repository.upsertFinalCut(finalCut);
  expect(await repository.findCurrentFinalCutByProjectId("project_1")).toMatchObject({
    id: "final_cut_1",
    status: "ready",
  });
});

it("writes final cut stable assets and manifest", async () => {
  await storage.writeFinalCutAssets(...);
  expect(await fs.readFile(currentMp4Path)).toEqual(expectedBytes);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sweet-star/services test -- --run packages/services/tests/sqlite-video-repository.test.ts packages/services/tests/video-storage.test.ts`
Expected: FAIL because final cut persistence methods do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Extend the sqlite schema/repository and filesystem video storage with final cut support.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sweet-star/services test -- --run packages/services/tests/sqlite-video-repository.test.ts packages/services/tests/video-storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/services/src/video-repository/sqlite-video-schema.ts packages/services/src/video-repository/sqlite-video-repository.ts packages/services/src/storage/video-storage.ts packages/services/tests/sqlite-video-repository.test.ts packages/services/tests/video-storage.test.ts
git commit -m "feat: add final cut storage support"
```

### Task 4: Add failing worker test for final cut execution

**Files:**
- Create: `packages/core/tests/process-final-cut-generate-task.test.ts`
- Create: `packages/core/src/use-cases/process-final-cut-generate-task.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("writes a concat manifest in scene/segment/shot order and persists the final cut", async () => {
  await useCase.execute({ taskId: "task_final_cut_1" });

  expect(videoStorage.writeFinalCutManifest).toHaveBeenCalledWith(
    expect.objectContaining({
      lines: [
        "file '...scene_1...shot_1/current.mp4'",
        "file '...scene_1...shot_2/current.mp4'",
        "file '...scene_2...shot_1/current.mp4'",
      ],
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sweet-star/core test -- --run packages/core/tests/process-final-cut-generate-task.test.ts`
Expected: FAIL because the processing use case does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement task loading, validation, ordering, manifest creation, ffmpeg invocation abstraction, and final cut persistence.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sweet-star/core test -- --run packages/core/tests/process-final-cut-generate-task.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/process-final-cut-generate-task.ts packages/core/tests/process-final-cut-generate-task.test.ts
git commit -m "feat: process final cut generation tasks"
```

## Chunk 3: API, Studio, And End-to-End Wiring

### Task 5: Add failing API tests for final cut routes

**Files:**
- Modify: `apps/api/tests/video-api.test.ts`
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/http/register-video-routes.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("creates a final cut task", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/projects/project_1/final-cut/generate",
    payload: {},
  });

  expect(response.statusCode).toBe(201);
});

it("returns the current final cut state", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/projects/project_1/final-cut",
  });

  expect(response.json()).toEqual({
    currentFinalCut: null,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sweet-star/api test -- --run apps/api/tests/video-api.test.ts`
Expected: FAIL because routes and service wiring do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Wire final cut use cases into bootstrap and expose the new routes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sweet-star/api test -- --run apps/api/tests/video-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/bootstrap/build-spec1-services.ts apps/api/src/http/register-video-routes.ts apps/api/tests/video-api.test.ts
git commit -m "feat: expose final cut API routes"
```

### Task 6: Add failing Studio tests for final cut UX

**Files:**
- Modify: `apps/studio/src/services/api-client.ts`
- Modify: `apps/studio/src/components/video-phase-panel.tsx`
- Modify: `apps/studio/tests/integration/api-client.test.ts`
- Modify: `apps/studio/tests/integration/video-phase-panel.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("disables final cut generation until all shots are approved", async () => {
  renderPanel({ approvedShotCount: 1, shotCount: 2 });
  expect(screen.getByRole("button", { name: "生成成片" })).toBeDisabled();
});

it("renders final cut playback and download when ready", async () => {
  renderPanel({
    finalCut: {
      status: "ready",
      videoAssetPath: "final-cut/current.mp4",
    },
  });

  expect(screen.getByRole("video")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "下载 MP4" })).toHaveAttribute("href", expect.stringContaining("final-cut/current.mp4"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sweet-star/studio test -- --run apps/studio/tests/integration/api-client.test.ts apps/studio/tests/integration/video-phase-panel.test.tsx`
Expected: FAIL because final cut client calls and UI do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add final cut API client methods, fetch state into the video panel flow, and render the final cut action/player area.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sweet-star/studio test -- --run apps/studio/tests/integration/api-client.test.ts apps/studio/tests/integration/video-phase-panel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/services/api-client.ts apps/studio/src/components/video-phase-panel.tsx apps/studio/tests/integration/api-client.test.ts apps/studio/tests/integration/video-phase-panel.test.tsx
git commit -m "feat: add final cut controls to studio"
```

## Chunk 4: Final Verification

### Task 7: Run focused verification for the feature

**Files:**
- Test: `packages/shared/tests/video-api-schema.test.ts`
- Test: `packages/core/tests/create-final-cut-generate-task.test.ts`
- Test: `packages/core/tests/get-final-cut.test.ts`
- Test: `packages/core/tests/process-final-cut-generate-task.test.ts`
- Test: `packages/services/tests/sqlite-video-repository.test.ts`
- Test: `packages/services/tests/video-storage.test.ts`
- Test: `apps/api/tests/video-api.test.ts`
- Test: `apps/studio/tests/integration/api-client.test.ts`
- Test: `apps/studio/tests/integration/video-phase-panel.test.tsx`

- [ ] **Step 1: Run focused test suite**

Run: `pnpm test -- --run packages/shared/tests/video-api-schema.test.ts packages/core/tests/create-final-cut-generate-task.test.ts packages/core/tests/get-final-cut.test.ts packages/core/tests/process-final-cut-generate-task.test.ts packages/services/tests/sqlite-video-repository.test.ts packages/services/tests/video-storage.test.ts apps/api/tests/video-api.test.ts apps/studio/tests/integration/api-client.test.ts apps/studio/tests/integration/video-phase-panel.test.tsx`
Expected: PASS

- [ ] **Step 2: Run any required formatting or type checks touched by the feature**

Run: `pnpm -r exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add project final cut export flow"
```

Plan complete and saved to `docs/superpowers/plans/2026-03-31-final-cut-export.md`. Ready to execute?
