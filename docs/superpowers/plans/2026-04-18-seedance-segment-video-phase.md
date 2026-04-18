# Seedance Segment Video Phase Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current shot-first Kling video phase with a segment-first Seedance 2.0 multimodal workflow that auto-assembles reference images, supports uploaded reference audio, and keeps the existing review and final-cut flow.

**Architecture:** Rework the video phase around `segment` as the core record and generation unit. Shared types, core tasks, persistence, storage, API, worker bootstrap, and Studio UI all move from `startFrame/endFrame` semantics to persisted `referenceImages/referenceAudios + promptText` semantics, while keeping project-level batch flow and approval mechanics stable.

**Tech Stack:** TypeScript, React, Fastify, BullMQ, SQLite, local project file storage, Seedance 2.0 provider integration

---

## Chunk 1: Replace Public Video Types With Segment-First Models

### Task 1: Redefine shared video API types around segment records

**Files:**
- Modify: `packages/shared/src/types/video.ts`
- Modify: `packages/shared/src/schemas/video-api.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/project-api-schema.test.ts`
- Reference: `docs/superpowers/specs/2026-04-18-seedance-segment-video-phase-design.md`

- [ ] **Step 1: Write the failing shared schema test**

Add assertions that the public video response now exposes:

- `segmentCount`
- `approvedSegmentCount`
- `referenceImages`
- `referenceAudios`
- no shot-first-only assumptions in the main response shape

- [ ] **Step 2: Run the targeted shared test to confirm failure**

Run: `corepack pnpm test --filter @sweet-star/shared`

Expected: failing assertions or type/schema mismatches for the old shot-first fields.

- [ ] **Step 3: Update `packages/shared/src/types/video.ts`**

Define:

- `SegmentVideoReferenceImage`
- `SegmentVideoReferenceAudio`
- `SegmentVideoRecord`
- segment-based `CurrentVideoBatchSummary`

Remove or de-emphasize shot-first aliases from public typing.

- [ ] **Step 4: Update `packages/shared/src/schemas/video-api.ts`**

Mirror the new segment-based record shape and add request schemas for:

- segment config save
- reference audio upload metadata if applicable

- [ ] **Step 5: Update barrel exports**

Export the new types and schemas through `packages/shared/src/index.ts`.

- [ ] **Step 6: Run the targeted shared test again**

Run: `corepack pnpm test --filter @sweet-star/shared`

Expected: shared schema tests pass with segment-first responses.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types/video.ts packages/shared/src/schemas/video-api.ts packages/shared/src/index.ts packages/shared/tests/project-api-schema.test.ts
git commit -m "refactor: redefine video api types around segments"
```

## Chunk 2: Rebuild Core Video Domain And Task Contracts

### Task 2: Convert video domain entities and task inputs to Seedance segment semantics

**Files:**
- Modify: `packages/core/src/domain/video.ts`
- Modify: `packages/core/src/domain/task.ts`
- Modify: `packages/core/src/ports/video-provider.ts`
- Modify: `packages/core/src/ports/video-storage.ts`
- Modify: `packages/core/src/ports/video-repository.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/use-cases/list-videos.ts`

- [ ] **Step 1: Write failing core-level tests or adjust existing use-case tests**

Add expectations that one segment record contains:

- segment identity fields
- reference image/audio arrays
- no dependency on shot frame pairs for provider submission

- [ ] **Step 2: Run targeted core tests to confirm failure**

Run: `corepack pnpm test --filter @sweet-star/core`

Expected: task/domain tests fail against old record contracts.

- [ ] **Step 3: Update `packages/core/src/domain/video.ts`**

Rebuild:

- `VideoBatchRecord`
- `SegmentVideoRecordEntity`
- summary helpers

Use `segmentOrder`, `segmentName`, `segmentSummary`, `shotCount`, `sourceShotIds`, `referenceImages`, and `referenceAudios`.

- [ ] **Step 4: Update `packages/core/src/domain/task.ts`**

Redefine:

- `VideosGenerateTaskInput`
- `SegmentVideoPromptGenerateTaskInput`
- `SegmentVideoGenerateTaskInput`

Make them segment-first and Seedance-oriented.

- [ ] **Step 5: Update the provider and storage ports**

Change `packages/core/src/ports/video-provider.ts` to accept persisted segment config:

- prompt text
- reference images
- reference audios

Update `packages/core/src/ports/video-storage.ts` and `packages/core/src/ports/video-repository.ts` to support persisted reference assets and segment records.

- [ ] **Step 6: Export the new contracts**

Update `packages/core/src/index.ts`.

- [ ] **Step 7: Run targeted core tests**

Run: `corepack pnpm test --filter @sweet-star/core`

Expected: domain and contract-level tests pass against the new segment model.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/domain/video.ts packages/core/src/domain/task.ts packages/core/src/ports/video-provider.ts packages/core/src/ports/video-storage.ts packages/core/src/ports/video-repository.ts packages/core/src/index.ts
git commit -m "refactor: convert core video contracts to seedance segments"
```

## Chunk 3: Add Deterministic Segment Reference Assembly

### Task 3: Introduce automatic segment reference composition from approved image outputs

**Files:**
- Create: `packages/core/src/use-cases/build-segment-video-references.ts`
- Modify: `packages/core/src/use-cases/process-videos-generate-task.ts`
- Modify: `packages/core/src/use-cases/regenerate-video-prompt.ts`
- Modify: `packages/core/src/use-cases/regenerate-all-video-prompts.ts`
- Test: `packages/core/src/use-cases/process-videos-generate-task.test.ts`

- [ ] **Step 1: Write a failing test for segment reference assembly**

Cover:

- one record per segment
- deterministic image ordering
- deduplication
- empty audio list initialization

- [ ] **Step 2: Run the targeted core test**

Run: `corepack pnpm test --filter @sweet-star/core process-videos-generate-task`

Expected: failure because the current flow still builds shot records.

- [ ] **Step 3: Add `build-segment-video-references.ts`**

Implement deterministic reference selection:

- read all shots in the segment
- collect approved start frames
- optionally include valuable end frames
- deduplicate by asset path
- sort by shot order then frame role
- cap to the configured limit

- [ ] **Step 4: Update `process-videos-generate-task.ts`**

Change orchestration to:

- create one batch
- create one segment record per shot script segment
- store assembled `referenceImages`
- initialize empty `referenceAudios`
- queue prompt generation per segment

- [ ] **Step 5: Update prompt regeneration use cases**

Ensure prompt regeneration reads the persisted segment configuration instead of assuming shot-level frames.

- [ ] **Step 6: Re-run the targeted core test**

Run: `corepack pnpm test --filter @sweet-star/core process-videos-generate-task`

Expected: passing coverage for segment-first batch orchestration.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/use-cases/build-segment-video-references.ts packages/core/src/use-cases/process-videos-generate-task.ts packages/core/src/use-cases/regenerate-video-prompt.ts packages/core/src/use-cases/regenerate-all-video-prompts.ts packages/core/src/use-cases/process-videos-generate-task.test.ts
git commit -m "feat: assemble seedance segment references automatically"
```

## Chunk 4: Rewrite Prompt Generation For Seedance Segment Prompts

### Task 4: Replace shot-level Kling prompt assumptions with segment-level Seedance prompt planning

**Files:**
- Modify: `packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts`
- Modify: `packages/core/src/use-cases/build-video-prompt-provider-input.ts`
- Modify: `packages/core/src/ports/video-prompt-provider.ts`
- Modify: `packages/services/src/providers/gemini-video-prompt-provider.ts`
- Modify: `packages/services/src/providers/grok-video-prompt-provider.ts`
- Modify: `packages/services/src/providers/video-prompt-plan.ts`
- Test: `packages/core/src/use-cases/process-segment-video-prompt-generate-task.test.ts`

- [ ] **Step 1: Write the failing prompt-generation test**

Assert that prompt planning now uses:

- the full segment
- its contained shots
- assembled image references
- uploaded audio references

and that the stored plan remains segment-scoped.

- [ ] **Step 2: Run the targeted prompt-generation test**

Run: `corepack pnpm test --filter @sweet-star/core process-segment-video-prompt-generate-task`

Expected: failure from old shot-only input assumptions.

- [ ] **Step 3: Update the prompt-provider contract**

Change `packages/core/src/ports/video-prompt-provider.ts` and `build-video-prompt-provider-input.ts` to build Seedance-oriented segment inputs.

- [ ] **Step 4: Update `process-segment-video-prompt-generate-task.ts`**

Read and write prompt plans against the new segment record shape.

- [ ] **Step 5: Rewrite the Gemini and Grok prompt providers**

Adjust system prompts and parsing logic so they generate:

- Seedance segment prompts
- continuity-first time-axis prompts
- preserved dialogue/audio constraints

- [ ] **Step 6: Update prompt-plan helpers**

Refactor `packages/services/src/providers/video-prompt-plan.ts` so all hard constraints and generated text match Seedance semantics instead of Kling single-shot semantics.

- [ ] **Step 7: Re-run the targeted prompt-generation test**

Run: `corepack pnpm test --filter @sweet-star/core process-segment-video-prompt-generate-task`

Expected: prompt generation passes with segment-first inputs and persisted plans.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/use-cases/process-segment-video-prompt-generate-task.ts packages/core/src/use-cases/build-video-prompt-provider-input.ts packages/core/src/ports/video-prompt-provider.ts packages/services/src/providers/gemini-video-prompt-provider.ts packages/services/src/providers/grok-video-prompt-provider.ts packages/services/src/providers/video-prompt-plan.ts packages/core/src/use-cases/process-segment-video-prompt-generate-task.test.ts
git commit -m "refactor: generate seedance segment prompt plans"
```

## Chunk 5: Add Seedance Provider And Remove Kling-Centric Runtime Assumptions

### Task 5: Implement Seedance video provider and worker bootstrap integration

**Files:**
- Create: `packages/services/src/providers/seedance-video-provider.ts`
- Create: `packages/services/src/providers/seedance-video-provider.types.ts`
- Modify: `packages/services/src/index.ts`
- Modify: `apps/worker/src/bootstrap/video-provider-config.ts`
- Modify: `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
- Modify: `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- Test: `apps/worker/tests/video-worker.integration.test.ts`

- [ ] **Step 1: Write a failing worker/provider integration test**

Cover:

- segment generation task routes into the Seedance provider path
- stored references are passed to the provider
- old frame-pair-only assumptions are gone

- [ ] **Step 2: Run the targeted worker test**

Run: `corepack pnpm test --filter @sweet-star/worker video-worker.integration.test.ts`

Expected: failure because the current provider contract expects start/end frames only.

- [ ] **Step 3: Implement the Seedance provider**

Add request types, submission, polling, and result parsing in:

- `packages/services/src/providers/seedance-video-provider.types.ts`
- `packages/services/src/providers/seedance-video-provider.ts`

- [ ] **Step 4: Export the provider through `packages/services/src/index.ts`**

Make the Seedance provider available to the worker bootstrap.

- [ ] **Step 5: Simplify `video-provider-config.ts`**

Replace the Kling/Sora switch with Seedance-only construction using:

- `SEEDANCE_API_BASE_URL`
- `SEEDANCE_API_KEY`
- `SEEDANCE_MODEL`
- optional duration/aspect ratio env vars

- [ ] **Step 6: Update `build-spec2-worker-services.ts` and `process-segment-video-generate-task.ts`**

Pass persisted segment config to the provider and stop resolving only frame-pair inputs.

- [ ] **Step 7: Re-run the targeted worker test**

Run: `corepack pnpm test --filter @sweet-star/worker video-worker.integration.test.ts`

Expected: worker integration passes through the Seedance path.

- [ ] **Step 8: Commit**

```bash
git add packages/services/src/providers/seedance-video-provider.ts packages/services/src/providers/seedance-video-provider.types.ts packages/services/src/index.ts apps/worker/src/bootstrap/video-provider-config.ts apps/worker/src/bootstrap/build-spec2-worker-services.ts packages/core/src/use-cases/process-segment-video-generate-task.ts apps/worker/tests/video-worker.integration.test.ts
git commit -m "feat: integrate seedance segment video provider"
```

## Chunk 6: Persist Segment References And Add Audio Upload Support

### Task 6: Extend SQLite and storage layers for segment references and uploaded audio assets

**Files:**
- Modify: `packages/services/src/video-repository/sqlite-video-schema.ts`
- Modify: `packages/services/src/video-repository/sqlite-video-repository.ts`
- Modify: `packages/services/src/storage/video-storage.ts`
- Modify: `packages/core/src/use-cases/update-video-prompt.ts` or replace with `save-segment-video-config.ts`
- Create: `packages/core/src/use-cases/save-segment-video-config.ts`
- Create: `packages/core/src/use-cases/upload-segment-video-audio.ts`
- Test: `packages/services/src/video-repository/sqlite-video-repository.test.ts`

- [ ] **Step 1: Write failing persistence tests for segment reference JSON fields**

Cover:

- `source_shot_ids_json`
- `reference_images_json`
- `reference_audios_json`
- round-trip behavior

- [ ] **Step 2: Run the targeted persistence test**

Run: `corepack pnpm test --filter @sweet-star/services sqlite-video-repository`

Expected: failure because the schema and repository do not persist reference arrays yet.

- [ ] **Step 3: Update SQLite schema**

Add non-destructive columns for:

- `segment_name`
- `segment_summary`
- `shot_count`
- `source_shot_ids_json`
- `reference_images_json`
- `reference_audios_json`

- [ ] **Step 4: Update the repository mapping**

Read and write the new JSON columns and stop depending on shot-first fields for live behavior.

- [ ] **Step 5: Extend video storage**

Add helpers to:

- persist uploaded reference audio files
- persist optional manual reference image files
- place both under the segment `references/` directory

- [ ] **Step 6: Add core save/upload use cases**

Implement:

- `save-segment-video-config.ts`
- `upload-segment-video-audio.ts`

so operators can save prompt/image/audio config and upload audio assets.

- [ ] **Step 7: Re-run the targeted persistence test**

Run: `corepack pnpm test --filter @sweet-star/services sqlite-video-repository`

Expected: repository/storage tests pass with persisted segment references.

- [ ] **Step 8: Commit**

```bash
git add packages/services/src/video-repository/sqlite-video-schema.ts packages/services/src/video-repository/sqlite-video-repository.ts packages/services/src/storage/video-storage.ts packages/core/src/use-cases/save-segment-video-config.ts packages/core/src/use-cases/upload-segment-video-audio.ts
git commit -m "feat: persist segment video references and audio uploads"
```

## Chunk 7: Rework API Routes Around Segment Config And Audio Uploads

### Task 7: Replace prompt-only video mutations with segment config endpoints

**Files:**
- Modify: `apps/api/src/http/register-video-routes.ts`
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `packages/shared/src/schemas/video-api.ts`
- Test: `apps/api/src/http/register-video-routes.test.ts`

- [ ] **Step 1: Write failing API route tests**

Cover:

- `PUT /projects/:projectId/videos/segments/:videoId/config`
- `POST /projects/:projectId/videos/segments/:videoId/generate`
- audio upload route presence and validation

- [ ] **Step 2: Run the targeted API test**

Run: `corepack pnpm test --filter @sweet-star/api register-video-routes`

Expected: failure because the current API still exposes prompt-only save and shot-like actions.

- [ ] **Step 3: Update service wiring**

Register the new save-config and upload-audio use cases in `build-spec1-services.ts` and pass them through `app.ts`.

- [ ] **Step 4: Update HTTP routes**

Replace or deprecate prompt-only mutation routes with segment-config routes and audio upload endpoints.

- [ ] **Step 5: Align schemas with the new request bodies**

Ensure the shared request validation matches the new config payload shape.

- [ ] **Step 6: Re-run the targeted API test**

Run: `corepack pnpm test --filter @sweet-star/api register-video-routes`

Expected: API route tests pass with the segment config contract.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/http/register-video-routes.ts apps/api/src/bootstrap/build-spec1-services.ts apps/api/src/app.ts packages/shared/src/schemas/video-api.ts apps/api/src/http/register-video-routes.test.ts
git commit -m "refactor: expose segment video config and audio upload routes"
```

## Chunk 8: Rebuild Studio Video Workspace Around Segment Cards

### Task 8: Replace shot-oriented UI with segment-oriented video workspace editing

**Files:**
- Modify: `apps/studio/src/components/video-phase-panel.tsx`
- Modify: `apps/studio/src/components/video-phase-panel/constants.ts`
- Modify: `apps/studio/src/components/video-phase-panel/utils.ts`
- Replace: `apps/studio/src/components/video-phase-panel/video-shot-card.tsx`
- Create: `apps/studio/src/components/video-phase-panel/video-segment-card.tsx`
- Modify: `apps/studio/src/services/api-client/videos.ts`
- Test: `apps/studio/src/components/video-phase-panel/video-phase-panel.test.tsx`

- [ ] **Step 1: Write the failing Studio component test**

Cover:

- one card per segment
- rendered reference image list
- audio upload affordance
- save-config flow
- generate and approve actions

- [ ] **Step 2: Run the targeted Studio test**

Run: `corepack pnpm test --filter @sweet-star/studio video-phase-panel`

Expected: failure because the current UI still renders shot cards and prompt-only mutations.

- [ ] **Step 3: Add `video-segment-card.tsx`**

Render:

- segment metadata
- prompt editor
- reference image editor
- reference audio list and upload controls
- current video preview
- generate/approve controls

- [ ] **Step 4: Update `video-phase-panel.tsx`**

Switch all list and action logic from shots to segments and wire the new config endpoints.

- [ ] **Step 5: Update API client helpers**

Add methods for:

- save config
- generate current segment
- upload/delete reference audio

- [ ] **Step 6: Re-run the targeted Studio test**

Run: `corepack pnpm test --filter @sweet-star/studio video-phase-panel`

Expected: Studio tests pass with segment-first rendering and editing.

- [ ] **Step 7: Commit**

```bash
git add apps/studio/src/components/video-phase-panel.tsx apps/studio/src/components/video-phase-panel/constants.ts apps/studio/src/components/video-phase-panel/utils.ts apps/studio/src/components/video-phase-panel/video-segment-card.tsx apps/studio/src/services/api-client/videos.ts apps/studio/src/components/video-phase-panel/video-phase-panel.test.tsx
git commit -m "refactor: rebuild studio video workspace around segments"
```

## Chunk 9: Preserve Review And Final Cut Behavior At Segment Granularity

### Task 9: Keep approvals and final cut stable after the segment-first rewrite

**Files:**
- Modify: `packages/core/src/use-cases/approve-video-segment.ts`
- Modify: `packages/core/src/use-cases/approve-all-video-segments.ts`
- Modify: `packages/core/src/use-cases/process-final-cut-generate-task.ts`
- Test: `packages/core/src/use-cases/process-final-cut-generate-task.test.ts`

- [ ] **Step 1: Write a failing final-cut regression test**

Assert that the final cut concatenates approved segment videos by `segmentOrder`.

- [ ] **Step 2: Run the targeted final-cut test**

Run: `corepack pnpm test --filter @sweet-star/core process-final-cut-generate-task`

Expected: failure if the old logic still relies on shot-order semantics.

- [ ] **Step 3: Update approval use cases if needed**

Ensure single-approve and approve-all operate on segment-first counts and summaries.

- [ ] **Step 4: Update final cut ordering**

Make the final cut consume approved segment video assets in segment order.

- [ ] **Step 5: Re-run the targeted final-cut test**

Run: `corepack pnpm test --filter @sweet-star/core process-final-cut-generate-task`

Expected: passing segment-order final cut assembly.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/use-cases/approve-video-segment.ts packages/core/src/use-cases/approve-all-video-segments.ts packages/core/src/use-cases/process-final-cut-generate-task.ts packages/core/src/use-cases/process-final-cut-generate-task.test.ts
git commit -m "fix: keep review and final cut aligned with segment videos"
```

## Chunk 10: Full Verification And Cleanup

### Task 10: Verify the redesigned video phase end-to-end

**Files:**
- Reference: `docs/superpowers/specs/2026-04-18-seedance-segment-video-phase-design.md`
- Reference: `docs/superpowers/plans/2026-04-18-seedance-segment-video-phase.md`

- [ ] **Step 1: Run shared tests**

Run: `corepack pnpm test --filter @sweet-star/shared`

Expected: PASS

- [ ] **Step 2: Run core tests**

Run: `corepack pnpm test --filter @sweet-star/core`

Expected: PASS

- [ ] **Step 3: Run services tests**

Run: `corepack pnpm test --filter @sweet-star/services`

Expected: PASS

- [ ] **Step 4: Run API tests**

Run: `corepack pnpm test --filter @sweet-star/api`

Expected: PASS

- [ ] **Step 5: Run worker tests**

Run: `corepack pnpm test --filter @sweet-star/worker`

Expected: PASS

- [ ] **Step 6: Run Studio tests**

Run: `corepack pnpm test --filter @sweet-star/studio`

Expected: PASS

- [ ] **Step 7: Run workspace typecheck**

Run: `corepack pnpm typecheck`

Expected: PASS

- [ ] **Step 8: Review git diff for accidental carry-over**

Run:

```bash
git diff --stat
```

Expected: only intended Seedance segment-first files are modified.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: redesign video phase for seedance segments"
```
