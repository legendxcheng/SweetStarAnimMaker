# Character Sheet Reference Images Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent per-character reference images to the character-sheet phase, expose them through API and Studio, and automatically include them in character generation while still supporting prompt-only generation.

**Architecture:** Store reference images as files plus a manifest under each character directory, expose add/delete/content routes from the API, extend character-sheet detail DTOs to include `referenceImages`, and thread local file paths into existing worker image-generation inputs only when references are present.

**Tech Stack:** TypeScript, Vitest, Fastify, `@fastify/multipart`, React, browser `FormData`, existing character-sheet storage and worker generation flow

---

## Chunk 1: Shared Types And Core Task Inputs

### Task 1: Extend shared character-sheet DTOs with reference-image data

**Files:**
- Modify: `packages/shared/src/types/character-sheet.ts`
- Modify: `packages/shared/src/schemas/character-sheet-api.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/character-sheet-api-schema.test.ts`

- [ ] **Step 1: Write the failing shared-schema test**

Add a schema test that expects:

```ts
referenceImages: [
  {
    id: "ref_1",
    fileName: "ref-001.png",
    originalFileName: "rin-face.png",
    mimeType: "image/png",
    sizeBytes: 1234,
    createdAt: "2026-03-22T12:00:00.000Z",
  },
]
```

- [ ] **Step 2: Run the shared test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/shared test -- character-sheet-api-schema`
Expected: FAIL because `referenceImages` is missing from the schema.

- [ ] **Step 3: Add the new type and schema fields**

Extend `CharacterSheetRecord` and the detail/list response schemas with `referenceImages`.

- [ ] **Step 4: Run the shared test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/shared test -- character-sheet-api-schema`
Expected: PASS.

### Task 2: Thread optional reference-image paths through character-generation task input

**Files:**
- Modify: `packages/core/src/domain/task.ts`
- Modify: `packages/core/src/use-cases/regenerate-character-sheet.ts`
- Modify: `packages/core/src/use-cases/process-character-sheet-generate-task.ts`
- Test: `packages/core/tests/regenerate-character-sheet.test.ts`
- Test: `packages/core/tests/process-character-sheet-generate-task.test.ts`

- [ ] **Step 1: Write a failing regenerate-task test**

Add an assertion that regenerated task input includes:

```ts
referenceImagePaths: ["E:/tmp/ref-1.png"]
```

when the selected character owns stored references.

- [ ] **Step 2: Run the targeted core tests to verify failure**

Run: `corepack pnpm --filter @sweet-star/core test -- regenerate-character-sheet process-character-sheet-generate-task`
Expected: FAIL because task input does not include the reference paths yet.

- [ ] **Step 3: Extend the task input contract and forward the field**

Update `CharacterSheetGenerateTaskInput` and keep `processCharacterSheetGenerateTask` forwarding `referenceImagePaths` to the provider.

- [ ] **Step 4: Run the targeted core tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/core test -- regenerate-character-sheet process-character-sheet-generate-task`
Expected: PASS.

## Chunk 2: Core Ports And Filesystem Storage

### Task 3: Add a core port for character reference-image storage

**Files:**
- Modify: `packages/core/src/ports/character-sheet-storage.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/get-character-sheet.test.ts`

- [ ] **Step 1: Write a failing core test around detail enrichment**

Update the detail test so the returned character includes a `referenceImages` array loaded from storage.

- [ ] **Step 2: Run the targeted core test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/core test -- get-character-sheet`
Expected: FAIL because the use case cannot yet enrich the record.

- [ ] **Step 3: Define new storage methods**

Add port methods for:

```ts
listReferenceImages(...)
saveReferenceImages(...)
deleteReferenceImage(...)
resolveReferenceImagePaths(...)
getReferenceImageContent(...)
```

Use exact method names that match the storage implementation style in this repo.

- [ ] **Step 4: Re-run the targeted test**

Run: `corepack pnpm --filter @sweet-star/core test -- get-character-sheet`
Expected: still failing until Chunk 3 implementation is added.

### Task 4: Implement filesystem reference-image storage and manifest helpers

**Files:**
- Modify: `packages/services/src/storage/character-sheet-storage.ts`
- Modify: `packages/services/src/storage/local-data-paths.ts`
- Modify: `packages/services/src/index.ts`
- Create: `packages/services/tests/character-sheet-reference-image-storage.test.ts`
- Test: `packages/services/tests/character-sheet-storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Cover:

```ts
it("writes reference image files and manifest entries")
it("deletes a reference image file and rewrites the manifest")
it("resolves absolute local file paths for current references")
it("returns content metadata for preview reads")
```

- [ ] **Step 2: Run the targeted services tests to verify failure**

Run: `corepack pnpm --filter @sweet-star/services test -- character-sheet-reference-image-storage character-sheet-storage`
Expected: FAIL because the new storage methods and paths do not exist.

- [ ] **Step 3: Add storage layout and manifest handling**

Implement `references/manifest.json` plus generated file names such as `ref-001.png`.

- [ ] **Step 4: Run the targeted services tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/services test -- character-sheet-reference-image-storage character-sheet-storage`
Expected: PASS.

## Chunk 3: Core Use Cases And API Routes

### Task 5: Enrich character detail use cases with stored reference images

**Files:**
- Modify: `packages/core/src/use-cases/get-character-sheet.ts`
- Modify: `packages/core/src/use-cases/list-character-sheets.ts`
- Test: `packages/core/tests/get-character-sheet.test.ts`
- Test: `packages/core/tests/list-character-sheets.test.ts`

- [ ] **Step 1: Add failing use-case assertions**

Require returned characters to contain `referenceImages`.

- [ ] **Step 2: Run the targeted core tests to verify failure**

Run: `corepack pnpm --filter @sweet-star/core test -- get-character-sheet list-character-sheets`
Expected: FAIL because the use cases still return repository-only data.

- [ ] **Step 3: Inject storage and merge reference images into DTOs**

Keep repository ownership of character records, and let storage append file-backed reference data.

- [ ] **Step 4: Re-run the targeted tests**

Run: `corepack pnpm --filter @sweet-star/core test -- get-character-sheet list-character-sheets`
Expected: PASS.

### Task 6: Add core use cases for upload and delete actions

**Files:**
- Create: `packages/core/src/use-cases/add-character-sheet-reference-images.ts`
- Create: `packages/core/src/use-cases/delete-character-sheet-reference-image.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/add-character-sheet-reference-images.test.ts`
- Test: `packages/core/tests/delete-character-sheet-reference-image.test.ts`

- [ ] **Step 1: Write failing use-case tests**

Cover:

```ts
it("stores uploaded image files for a character and returns updated detail")
it("deletes one reference image and returns updated detail")
it("rejects when the character does not belong to the project")
```

- [ ] **Step 2: Run the targeted core tests to verify failure**

Run: `corepack pnpm --filter @sweet-star/core test -- add-character-sheet-reference-images delete-character-sheet-reference-image`
Expected: FAIL because the use cases do not exist.

- [ ] **Step 3: Implement the minimal use cases**

Validate project and character ownership, delegate file work to `CharacterSheetStorage`, then return updated detail.

- [ ] **Step 4: Run the targeted core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- add-character-sheet-reference-images delete-character-sheet-reference-image`
Expected: PASS.

### Task 7: Add multipart upload, delete, and content routes in the API

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/http/register-character-sheet-routes.ts`
- Modify: `apps/api/src/http/error-handler.ts`
- Test: `apps/api/tests/character-sheets-api.test.ts`

- [ ] **Step 1: Add failing API tests**

Cover:

```ts
it("uploads character reference images and returns updated detail")
it("deletes a character reference image and returns updated detail")
it("streams character reference image content")
it("rejects non-image uploads")
```

- [ ] **Step 2: Run the targeted API test to verify failure**

Run: `corepack pnpm --filter @sweet-star/api test -- character-sheets-api`
Expected: FAIL because the routes and multipart support do not exist.

- [ ] **Step 3: Implement route wiring**

Register `@fastify/multipart`, expose the new services, and add the three reference-image routes.

- [ ] **Step 4: Run the targeted API test**

Run: `corepack pnpm --filter @sweet-star/api test -- character-sheets-api`
Expected: PASS.

## Chunk 4: Generation Integration

### Task 8: Use stored reference images in regenerate and batch-generated character tasks

**Files:**
- Modify: `packages/core/src/use-cases/process-character-sheets-generate-task.ts`
- Modify: `packages/core/src/use-cases/regenerate-character-sheet.ts`
- Test: `packages/core/tests/process-character-sheets-generate-task.test.ts`
- Test: `packages/core/tests/regenerate-character-sheet.test.ts`

- [ ] **Step 1: Add failing task-input assertions**

Require generated task inputs to include `referenceImagePaths` for characters that already own references and to omit them for characters without references.

- [ ] **Step 2: Run the targeted core tests to verify failure**

Run: `corepack pnpm --filter @sweet-star/core test -- process-character-sheets-generate-task regenerate-character-sheet`
Expected: FAIL because the use cases do not consult storage.

- [ ] **Step 3: Resolve local reference image paths from storage**

Keep the no-reference path as a valid prompt-only generation flow.

- [ ] **Step 4: Run the targeted tests**

Run: `corepack pnpm --filter @sweet-star/core test -- process-character-sheets-generate-task regenerate-character-sheet`
Expected: PASS.

### Task 9: Verify worker integration still supports uploader-backed generation

**Files:**
- Modify: `apps/worker/tests/character-sheet-worker.integration.test.ts`

- [ ] **Step 1: Add or update the failing worker assertion**

Ensure worker-built services still issue:

```ts
request.image = ["https://cdn.example/ref-1.png"]
```

when `referenceImagePaths` are present, and still work without them.

- [ ] **Step 2: Run the targeted worker test**

Run: `corepack pnpm --filter @sweet-star/worker test -- character-sheet-worker.integration`
Expected: PASS after the core task-input wiring is restored.

## Chunk 5: Studio API Client And Character Detail UI

### Task 10: Extend the Studio API client for reference-image actions

**Files:**
- Modify: `apps/studio/src/services/api-client.ts`
- Test: `apps/studio/tests/integration/character-sheets-phase-panel.test.tsx`

- [ ] **Step 1: Write a failing panel test for upload and delete callbacks**

Mock:

```ts
apiClient.uploadCharacterReferenceImages(...)
apiClient.deleteCharacterReferenceImage(...)
```

and assert they are called from the panel.

- [ ] **Step 2: Run the targeted Studio test to verify failure**

Run: `corepack pnpm --filter @sweet-star/studio test -- character-sheets-phase-panel`
Expected: FAIL because the client methods do not exist.

- [ ] **Step 3: Add API client helpers**

Use `FormData` for upload and avoid setting JSON content type for multipart requests.

- [ ] **Step 4: Re-run the targeted Studio test**

Run: `corepack pnpm --filter @sweet-star/studio test -- character-sheets-phase-panel`
Expected: still failing until UI is added.

### Task 11: Add the reference-image section to the character detail panel

**Files:**
- Modify: `apps/studio/src/components/character-sheets-phase-panel.tsx`
- Modify: `apps/studio/src/services/config.ts`
- Test: `apps/studio/tests/integration/character-sheets-phase-panel.test.tsx`

- [ ] **Step 1: Extend the failing UI test**

Cover:

```tsx
it("renders existing reference-image thumbnails")
it("uploads selected files and refreshes the character detail")
it("deletes one reference image and refreshes the character detail")
it("still allows regenerate when no reference images exist")
```

- [ ] **Step 2: Run the targeted Studio test to verify failure**

Run: `corepack pnpm --filter @sweet-star/studio test -- character-sheets-phase-panel`
Expected: FAIL because the UI has no reference-image section.

- [ ] **Step 3: Implement the minimal UI**

Add:

- `参考图` heading
- hidden file input and `添加参考图` button
- thumbnail grid using the API content route
- delete button per thumbnail

- [ ] **Step 4: Re-run the targeted Studio test**

Run: `corepack pnpm --filter @sweet-star/studio test -- character-sheets-phase-panel`
Expected: PASS.

## Chunk 6: Final Verification

### Task 12: Run end-to-end targeted verification for the feature slice

**Files:**
- Verify only

- [ ] **Step 1: Run shared tests**

Run: `corepack pnpm --filter @sweet-star/shared test -- character-sheet-api-schema`
Expected: PASS.

- [ ] **Step 2: Run core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- character-sheet get-character-sheet list-character-sheets process-character-sheet-generate-task process-character-sheets-generate-task regenerate-character-sheet add-character-sheet-reference-images delete-character-sheet-reference-image`
Expected: PASS.

- [ ] **Step 3: Run services tests**

Run: `corepack pnpm --filter @sweet-star/services test -- character-sheet-storage character-sheet-reference-image-storage turnaround-image-provider`
Expected: PASS.

- [ ] **Step 4: Run API tests**

Run: `corepack pnpm --filter @sweet-star/api test -- character-sheets-api spec5-character-sheet-flow.integration`
Expected: PASS.

- [ ] **Step 5: Run worker and Studio tests**

Run: `corepack pnpm --filter @sweet-star/worker test -- character-sheet-worker.integration`
Expected: PASS.

Run: `corepack pnpm --filter @sweet-star/studio test -- character-sheets-phase-panel project-detail-page`
Expected: PASS.
