# Premise Reset Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a destructive premise reset flow that lets users re-enter premise and visual style, confirms the action, and force-resets the project back to a clean `premise_ready` state.

**Architecture:** Introduce a dedicated project reset use case and API route rather than overloading the existing premise-update flow. The backend reset path should first make the project stop referencing downstream state, then remove downstream records/files/tasks, then persist the new premise metadata. The studio premise panel becomes an editable form with a confirmation dialog that calls the new route and refreshes project detail.

**Tech Stack:** TypeScript, Vitest, React, Fastify, Zod, SQLite, filesystem-backed storage

---

## Chunk 1: Shared Contract and API Route

### Task 1: Add the reset request contract

**Files:**
- Modify: `packages/shared/src/schemas/project-api.ts`
- Modify: `packages/shared/tests/project-api-schema.test.ts`

- [ ] **Step 1: Write the failing shared-schema test**

Add a test covering a valid reset payload and one invalid payload:

```ts
const parsed = resetProjectPremiseRequestSchema.parse({
  premiseText: "New premise",
  visualStyleText: "New style",
  confirmReset: true,
});

expect(parsed.confirmReset).toBe(true);
expect(() =>
  resetProjectPremiseRequestSchema.parse({
    premiseText: "New premise",
    visualStyleText: "New style",
  }),
).toThrow();
```

- [ ] **Step 2: Run the shared test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/shared test -- project-api-schema.test.ts`
Expected: FAIL because `resetProjectPremiseRequestSchema` does not exist yet.

- [ ] **Step 3: Implement the minimal shared schema**

Add a new exported schema:

```ts
export const resetProjectPremiseRequestSchema = z.object({
  premiseText: requiredTextSchema,
  visualStyleText: optionalTextSchema.optional().default(""),
  confirmReset: z.literal(true),
});
```

- [ ] **Step 4: Re-run the shared test**

Run: `corepack pnpm --filter @sweet-star/shared test -- project-api-schema.test.ts`
Expected: PASS

### Task 2: Add the reset route coverage before implementation

**Files:**
- Modify: `apps/api/tests/projects-api.test.ts`

- [ ] **Step 1: Write the failing API tests**

Add one success test and one invalid-confirmation test around:

```ts
await app.inject({
  method: "PUT",
  url: `/projects/${projectId}/premise/reset`,
  payload: {
    premiseText: "Reset premise",
    visualStyleText: "Reset style",
    confirmReset: true,
  },
});
```

Assertions for success:
- status `200`
- response `status` is `premise_ready`
- `premise.text` and `premise.visualStyleText` are updated
- `currentMasterPlot`, `currentCharacterSheetBatch`, `currentStoryboard`, `currentShotScript`, `currentImageBatch`, `currentVideoBatch` are all `null`

Assertions for invalid confirmation:
- status `400`

- [ ] **Step 2: Run the API test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/api test -- projects-api.test.ts`
Expected: FAIL with route/schema/use-case missing.

- [ ] **Step 3: Add the route shell**

Modify `apps/api/src/http/register-project-routes.ts` to parse `resetProjectPremiseRequestSchema` and call a new `services.resetProjectPremise.execute(...)`.

- [ ] **Step 4: Re-run the API test**

Run: `corepack pnpm --filter @sweet-star/api test -- projects-api.test.ts`
Expected: still FAIL, now at missing service wiring or backend logic.

## Chunk 2: Core Reset Orchestration

### Task 3: Define the reset use case with failing orchestration tests

**Files:**
- Create: `packages/core/src/use-cases/reset-project-premise.ts`
- Modify: `packages/core/src/index.ts`
- Create or Modify: `packages/core/tests/reset-project-premise.test.ts`

- [ ] **Step 1: Write the failing core use-case tests**

Cover these behaviors:
- reset rewrites premise and visual style
- reset clears all current pointers
- reset sets status to `premise_ready`
- reset preserves `id`, `name`, `slug`, `storageDir`
- reset rejects missing confirmation or empty premise

Include spies for:
- `repository.findById`
- `repository.updatePremiseMetadata`
- `repository.updateStatus`
- `repository.updateCurrentMasterPlot`
- `repository.updateCurrentCharacterSheetBatch`
- `repository.updateCurrentStoryboard`
- `repository.updateCurrentShotScript`
- `repository.updateCurrentImageBatch`
- `repository.updateCurrentVideoBatch`

- [ ] **Step 2: Run the core test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/core test -- reset-project-premise.test.ts`
Expected: FAIL because the new use case/export does not exist.

- [ ] **Step 3: Implement the minimal reset use case contract**

Create an interface like:

```ts
export interface ResetProjectPremiseInput {
  projectId: string;
  premiseText: string;
  visualStyleText?: string;
  confirmReset: true;
}
```

Implement the use case so it:
- validates trimmed premise/style
- loads the project
- captures a timestamp
- clears all current pointers
- resets status to `premise_ready`
- delegates downstream cleanup to injected repositories/storages
- rewrites premise metadata
- returns the updated `ProjectDetail`

- [ ] **Step 4: Re-run the core test**

Run: `corepack pnpm --filter @sweet-star/core test -- reset-project-premise.test.ts`
Expected: FAIL only on cleanup dependencies or DTO details, not on missing symbol errors.

### Task 4: Add project-scoped cleanup ports and failing repository/service tests

**Files:**
- Modify: `packages/core/src/ports/project-repository.ts`
- Modify: `packages/core/src/ports/task-repository.ts`
- Modify: `packages/core/src/ports/storyboard-storage.ts`
- Modify: `packages/core/src/ports/shot-script-storage.ts`
- Modify: `packages/core/src/ports/character-sheet-storage.ts`
- Modify: `packages/core/src/ports/shot-image-storage.ts`
- Modify: `packages/core/src/ports/video-storage.ts`
- Modify: `packages/services/tests/sqlite-project-repository.test.ts`
- Add or modify targeted storage tests in `packages/services/tests/*`

- [ ] **Step 1: Write the failing service tests**

Add tests proving the service layer can:
- delete all downstream SQLite rows for one project
- delete all task rows for one project
- remove downstream directories/files while preserving the project root for premise rewrite

- [ ] **Step 2: Run the focused service tests**

Run:
- `corepack pnpm --filter @sweet-star/services test -- sqlite-project-repository.test.ts`
- `corepack pnpm --filter @sweet-star/services test -- character-sheet-storage.test.ts`
- `corepack pnpm --filter @sweet-star/services test -- file-script-storage.test.ts`

Expected: FAIL because project-scoped cleanup helpers do not exist yet.

- [ ] **Step 3: Extend the ports with explicit cleanup methods**

Use names that make project scope obvious, for example:
- `ProjectRepository.resetProjectState(...)`
- `ProjectRepository.deleteDownstreamData(projectId)`
- `TaskRepository.deleteByProjectId(projectId)`
- `CharacterSheetStorage.deleteProjectArtifacts(storageDir)`
- `StoryboardStorage.deleteProjectArtifacts(storageDir)`
- `ShotScriptStorage.deleteProjectArtifacts(storageDir)`
- `ShotImageStorage.deleteProjectArtifacts(storageDir)`
- `VideoStorage.deleteProjectArtifacts(storageDir)`

- [ ] **Step 4: Implement the minimal SQLite/file cleanup helpers**

Implement only what the reset flow needs:
- delete downstream rows by `projectId`
- clear current pointers
- remove downstream directories such as `master-plot`, `character-sheets`, `storyboard`, `shot-script`, `images`, `videos`, and task folders under the project
- preserve the root project directory and `prompts` templates if they must survive project lifetime

- [ ] **Step 5: Re-run the focused service tests**

Run the same commands from Step 2.
Expected: PASS

## Chunk 3: Service Wiring and API Integration

### Task 5: Wire the new reset use case into API services

**Files:**
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/http/register-project-routes.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing API integration expectation**

Extend `apps/api/tests/projects-api.test.ts` so the reset route exercises the real service wiring against a temp workspace that already contains downstream project state.

- [ ] **Step 2: Run the API test**

Run: `corepack pnpm --filter @sweet-star/api test -- projects-api.test.ts`
Expected: FAIL because `buildSpec1Services` does not expose the new reset use case yet.

- [ ] **Step 3: Wire dependencies through `buildSpec1Services`**

Pass the repository/storage/task cleanup dependencies into `createResetProjectPremiseUseCase(...)` and expose it as `resetProjectPremise`.

- [ ] **Step 4: Re-run the API test**

Run: `corepack pnpm --filter @sweet-star/api test -- projects-api.test.ts`
Expected: PASS for the new reset route coverage.

### Task 6: Add stale-task safety coverage

**Files:**
- Modify: `packages/core/tests/process-master-plot-generate-task.test.ts`
- Modify: `packages/core/tests/process-storyboard-generate-task.test.ts`
- Modify: `packages/core/tests/process-shot-script-generate-task.test.ts`
- Modify: `packages/core/tests/process-images-generate-task.test.ts`
- Modify: `packages/core/tests/process-videos-generate-task.test.ts`

- [ ] **Step 1: Add at least one representative failing worker test**

Use one current worker flow first. Simulate reset by making the project/task missing or non-current before the worker tries to persist output, and assert that the stale task does not repopulate project state.

- [ ] **Step 2: Run the targeted worker/core test**

Run: `corepack pnpm --filter @sweet-star/core test -- process-master-plot-generate-task.test.ts`
Expected: FAIL because stale-task handling is not strict enough yet.

- [ ] **Step 3: Implement the minimal stale-task guard**

Prefer one centralized rule where workers abort if the task record is gone or if the project no longer points at the stage they are about to update.

- [ ] **Step 4: Re-run the targeted worker/core test**

Run: `corepack pnpm --filter @sweet-star/core test -- process-master-plot-generate-task.test.ts`
Expected: PASS

## Chunk 4: Studio Premise Workspace UX

### Task 7: Add the reset API client and UI tests first

**Files:**
- Modify: `apps/studio/src/services/api-client.ts`
- Modify: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing studio tests**

Add coverage that:
- premise panel renders editable `premiseText` and `visualStyleText`
- clicking `重新输入前提并重置项目` opens a confirmation dialog
- cancel does not call the API
- confirm calls `apiClient.resetProjectPremise("proj-1", {...})`

- [ ] **Step 2: Run the studio test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: FAIL because the panel is read-only and the API client method does not exist.

- [ ] **Step 3: Add the API client method**

Implement:

```ts
resetProjectPremise: (
  projectId: string,
  data: { premiseText: string; visualStyleText?: string; confirmReset: true },
) => request<ProjectDetail>(`/projects/${projectId}/premise/reset`, projectDetailResponseSchema, {
  method: "PUT",
  body: JSON.stringify(resetProjectPremiseRequestSchema.parse(data)),
})
```

- [ ] **Step 4: Re-run the studio test**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: still FAIL, now on missing panel behavior.

### Task 8: Convert the premise panel into an editable reset flow

**Files:**
- Modify: `apps/studio/src/components/premise-phase-panel.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Modify: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Implement the minimal editable form state**

Initialize local state from `project.premise.text` and `project.premise.visualStyleText`.

- [ ] **Step 2: Implement the confirmation dialog**

Use existing modal/dialog patterns if present; otherwise add the smallest local confirmation UI that:
- states the destructive consequences
- offers `取消` and `确认重置`
- disables confirm while the request is in flight

- [ ] **Step 3: Implement the submit flow**

On confirm:
- call `apiClient.resetProjectPremise(...)`
- update the page state with the returned project detail
- switch the selected phase back to `premise`
- keep errors visible without discarding user edits

- [ ] **Step 4: Re-run the studio test**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: PASS

## Chunk 5: Verification and Cleanup

### Task 9: Run the focused verification suite

**Files:**
- No code changes; verification only

- [ ] **Step 1: Run targeted package tests**

Run:
- `corepack pnpm --filter @sweet-star/shared test -- project-api-schema.test.ts`
- `corepack pnpm --filter @sweet-star/core test -- reset-project-premise.test.ts`
- `corepack pnpm --filter @sweet-star/core test -- process-master-plot-generate-task.test.ts`
- `corepack pnpm --filter @sweet-star/services test -- sqlite-project-repository.test.ts`
- `corepack pnpm --filter @sweet-star/api test -- projects-api.test.ts`
- `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: all PASS

- [ ] **Step 2: Run cross-package typechecks**

Run:
- `corepack pnpm --filter @sweet-star/shared typecheck`
- `corepack pnpm --filter @sweet-star/core typecheck`
- `corepack pnpm --filter @sweet-star/services typecheck`
- `corepack pnpm --filter @sweet-star/api typecheck`
- `corepack pnpm --filter @sweet-star/studio typecheck`

Expected: all PASS

- [ ] **Step 3: Commit the completed feature**

```bash
git add packages/shared/src/schemas/project-api.ts \
  packages/shared/tests/project-api-schema.test.ts \
  packages/core/src/use-cases/reset-project-premise.ts \
  packages/core/src/index.ts \
  packages/core/src/ports/project-repository.ts \
  packages/core/src/ports/task-repository.ts \
  packages/core/src/ports/storyboard-storage.ts \
  packages/core/src/ports/shot-script-storage.ts \
  packages/core/src/ports/character-sheet-storage.ts \
  packages/core/src/ports/shot-image-storage.ts \
  packages/core/src/ports/video-storage.ts \
  packages/core/tests/reset-project-premise.test.ts \
  packages/core/tests/process-master-plot-generate-task.test.ts \
  packages/services/src/project-repository/sqlite-project-repository.ts \
  packages/services/tests/sqlite-project-repository.test.ts \
  apps/api/src/bootstrap/build-spec1-services.ts \
  apps/api/src/http/register-project-routes.ts \
  apps/api/tests/projects-api.test.ts \
  apps/studio/src/services/api-client.ts \
  apps/studio/src/components/premise-phase-panel.tsx \
  apps/studio/src/pages/project-detail-page.tsx \
  apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: add destructive premise reset flow"
```
