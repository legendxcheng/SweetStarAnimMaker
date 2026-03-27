# Character Subject Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single and batch character-subject upload in Studio, persist uploaded Kling Omni subject metadata on character sheets, and automatically reuse stored `elementId` values during later video generation.

**Architecture:** Extend `CharacterSheetRecord` with a focused `subjectUpload` state object instead of adding a separate subject table. Wire new API endpoints and core use cases around the existing character-sheet repository, then thread uploaded `elementIds` through video task creation and segment video processing so the provider can switch to Omni element-based generation only when uploaded subjects exist.

**Tech Stack:** TypeScript, React, Fastify, Vitest, SQLite repositories, existing Sweet Star core/services/provider architecture

---

## Chunk 1: Contracts And Persistence

### Task 1: Add failing shared schema tests for subject upload contracts

**Files:**
- Modify: `packages/shared/src/types/character-sheet.ts`
- Modify: `packages/shared/src/schemas/character-sheet-api.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/character-sheet-api-schema.test.ts`

- [ ] **Step 1: Write the failing test**
  Add schema expectations for `subjectUpload` on character records and a batch-upload response payload.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/shared exec vitest run tests/character-sheet-api-schema.test.ts`
  Expected: FAIL because `subjectUpload` and the new response schema are missing.
- [ ] **Step 3: Write minimal implementation**
  Add the new shared types and zod schemas with defaultable/null-safe fields.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/shared exec vitest run tests/character-sheet-api-schema.test.ts`
  Expected: PASS

### Task 2: Add failing repository tests for persisted subject-upload state

**Files:**
- Modify: `packages/core/src/domain/character-sheet.ts`
- Modify: `packages/core/src/ports/character-sheet-repository.ts`
- Modify: `packages/services/src/character-sheet-repository/sqlite-character-sheet-repository.ts`
- Modify: `packages/services/src/sqlite/initialize-sqlite-schema.ts`
- Test: `packages/services/tests/sqlite-character-sheet-repository.test.ts`

- [ ] **Step 1: Write the failing test**
  Cover insert/find/update round-trips for `subjectUpload` fields in the sqlite character-sheet repository.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/services exec vitest run tests/sqlite-character-sheet-repository.test.ts`
  Expected: FAIL because the schema and row mapping do not include `subjectUpload`.
- [ ] **Step 3: Write minimal implementation**
  Extend the character-sheet domain model, sqlite schema, and row mappers to persist `subjectUpload`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/services exec vitest run tests/sqlite-character-sheet-repository.test.ts`
  Expected: PASS

## Chunk 2: Core Upload Use Cases

### Task 3: Add failing tests for single-character subject upload

**Files:**
- Create: `packages/core/src/use-cases/upload-character-subject.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/upload-character-subject.test.ts`
- Reference: `packages/core/src/use-cases/add-character-sheet-reference-images.ts`

- [ ] **Step 1: Write the failing test**
  Cover success, missing `imageAssetPath`, provider failure, and poll timeout for single-character subject upload.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/upload-character-subject.test.ts`
  Expected: FAIL because the use case and dependencies do not exist.
- [ ] **Step 3: Write minimal implementation**
  Implement the use case, validate image availability, resolve asset paths, call Kling Omni `createElement()` plus `getElement()` polling, and persist `subjectUpload`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/upload-character-subject.test.ts`
  Expected: PASS

### Task 4: Add failing tests for batch subject upload

**Files:**
- Create: `packages/core/src/use-cases/upload-all-character-subjects.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/upload-all-character-subjects.test.ts`

- [ ] **Step 1: Write the failing test**
  Cover sequential processing, partial failure reporting, and aggregate counts for current-batch character uploads.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/upload-all-character-subjects.test.ts`
  Expected: FAIL because the batch use case and result contract do not exist.
- [ ] **Step 3: Write minimal implementation**
  Implement the batch wrapper around the single-upload use case and return per-character results plus counts.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/upload-all-character-subjects.test.ts`
  Expected: PASS

## Chunk 3: API And Studio

### Task 5: Add failing API tests for subject-upload routes

**Files:**
- Modify: `apps/api/src/http/register-character-sheet-routes.ts`
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Test: `apps/api/tests/character-sheets-api.test.ts`

- [ ] **Step 1: Write the failing test**
  Add route tests for single-character and batch subject-upload endpoints.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/api exec vitest run tests/character-sheets-api.test.ts`
  Expected: FAIL because the routes and service wiring are missing.
- [ ] **Step 3: Write minimal implementation**
  Wire the new use cases into service bootstrap and register the two Fastify endpoints.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/api exec vitest run tests/character-sheets-api.test.ts`
  Expected: PASS

### Task 6: Add failing Studio tests for single and batch subject upload

**Files:**
- Modify: `apps/studio/src/services/api-client.ts`
- Modify: `apps/studio/src/components/character-sheets-phase-panel.tsx`
- Test: `apps/studio/tests/integration/api-client.test.ts`
- Test: `apps/studio/tests/integration/character-sheets-phase-panel.test.tsx`

- [ ] **Step 1: Write the failing test**
  Cover new API-client methods, single upload action, batch upload action, subject status rendering, and error rendering.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/studio exec vitest run tests/integration/api-client.test.ts tests/integration/character-sheets-phase-panel.test.tsx`
  Expected: FAIL because the client methods and UI controls are missing.
- [ ] **Step 3: Write minimal implementation**
  Add the API client calls, subject-upload UI state, status text, buttons, and optimistic refresh handling in the character sheets panel.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/studio exec vitest run tests/integration/api-client.test.ts tests/integration/character-sheets-phase-panel.test.tsx`
  Expected: PASS

## Chunk 4: Video Reuse Integration

### Task 7: Add failing core tests for automatic video `elementId` reuse

**Files:**
- Modify: `packages/core/src/domain/task.ts`
- Modify: `packages/core/src/use-cases/create-videos-generate-task.ts`
- Modify: `packages/core/src/use-cases/process-videos-generate-task.ts`
- Modify: `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- Modify: `packages/core/src/ports/video-provider.ts`
- Test: `packages/core/tests/create-videos-generate-task.test.ts`
- Test: `packages/core/tests/process-videos-generate-task.test.ts`
- Test: `packages/core/tests/process-segment-video-generate-task.test.ts`

- [ ] **Step 1: Write the failing test**
  Cover selected-character matching, de-duplicated `elementIds`, and fallback to existing frame-based video flow when no uploaded subjects exist.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/create-videos-generate-task.test.ts tests/process-videos-generate-task.test.ts tests/process-segment-video-generate-task.test.ts`
  Expected: FAIL because segment video task input and provider input do not include `elementIds`.
- [ ] **Step 3: Write minimal implementation**
  Thread uploaded subject ids through video task creation and provider invocation, preserving existing behavior when no ids are present.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/create-videos-generate-task.test.ts tests/process-videos-generate-task.test.ts tests/process-segment-video-generate-task.test.ts`
  Expected: PASS

### Task 8: Add failing services test for Omni element-based video generation

**Files:**
- Modify: `packages/services/src/providers/kling-video-provider.ts`
- Test: `packages/services/tests/kling-video-provider.test.ts`
- Reference: `packages/services/src/providers/kling-omni-provider.ts`

- [ ] **Step 1: Write the failing test**
  Cover provider behavior when `elementIds` are passed so the request uses Omni element submission instead of frame-based submission.
- [ ] **Step 2: Run test to verify it fails**
  Run: `corepack pnpm --filter @sweet-star/services exec vitest run tests/kling-video-provider.test.ts`
  Expected: FAIL because the provider input has no `elementIds` branch yet.
- [ ] **Step 3: Write minimal implementation**
  Extend the video provider surface and Kling provider adapter to prefer Omni elements when `elementIds` are present.
- [ ] **Step 4: Run test to verify it passes**
  Run: `corepack pnpm --filter @sweet-star/services exec vitest run tests/kling-video-provider.test.ts`
  Expected: PASS

## Chunk 5: End-To-End Verification

### Task 9: Run focused verification and record any residual gaps

**Files:**
- Verify only

- [ ] **Step 1: Run shared tests**
  Run: `corepack pnpm --filter @sweet-star/shared exec vitest run tests/character-sheet-api-schema.test.ts`
- [ ] **Step 2: Run core tests**
  Run: `corepack pnpm --filter @sweet-star/core exec vitest run tests/upload-character-subject.test.ts tests/upload-all-character-subjects.test.ts tests/create-videos-generate-task.test.ts tests/process-videos-generate-task.test.ts tests/process-segment-video-generate-task.test.ts`
- [ ] **Step 3: Run services tests**
  Run: `corepack pnpm --filter @sweet-star/services exec vitest run tests/sqlite-character-sheet-repository.test.ts tests/kling-video-provider.test.ts`
- [ ] **Step 4: Run API tests**
  Run: `corepack pnpm --filter @sweet-star/api exec vitest run tests/character-sheets-api.test.ts`
- [ ] **Step 5: Run Studio tests**
  Run: `corepack pnpm --filter @sweet-star/studio exec vitest run tests/integration/api-client.test.ts tests/integration/character-sheets-phase-panel.test.tsx`
- [ ] **Step 6: Run a repo-level typecheck if targeted tests expose contract drift**
  Run: `corepack pnpm typecheck`
