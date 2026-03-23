# Segment-First Shot Script To Images Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `storyboard -> shot_script -> images` flow with a segment-first pipeline where `1 segment -> N shots`, `shot_script` is generated one segment at a time in Chinese, and `images` generates start/end frames per segment.

**Architecture:** Keep `storyboard` as the narrative source, redesign `shot_script` as a grouped segment artifact with per-segment tasks and approvals, then redesign `images` around per-segment frame pairs instead of per-shot stills. Reuse the existing project/task/review patterns already present in the codebase, but update shared contracts, storage, API, worker, and studio to align on the new segment-first model.

**Tech Stack:** TypeScript, Zod, Vitest, Fastify, BullMQ, SQLite, filesystem-backed local storage, existing Gemini/image provider adapters

---

## Spec Reference

- `docs/superpowers/specs/2026-03-23-shot-script-to-images-design.md`

## File Map

### Shared Contracts

- Modify: `packages/shared/src/constants/project-status.ts`
- Modify: `packages/shared/src/constants/task-type.ts`
- Create or modify: `packages/shared/src/types/shot-script.ts`
- Create or modify: `packages/shared/src/types/shot-image.ts`
- Create or modify: `packages/shared/src/schemas/shot-script-api.ts`
- Create or modify: `packages/shared/src/schemas/image-api.ts`
- Modify: `packages/shared/src/schemas/project-api.ts`
- Modify: `packages/shared/src/types/project-detail.ts`
- Modify: `packages/shared/src/types/project-summary.ts`
- Modify: `packages/shared/src/index.ts`
- Add or update focused tests under `packages/shared/tests`

### Core

- Modify: `packages/core/src/domain/task.ts`
- Create or modify: `packages/core/src/domain/shot-script.ts`
- Create or modify: `packages/core/src/domain/shot-image.ts`
- Create or modify: `packages/core/src/ports/shot-script-provider.ts`
- Create or modify: `packages/core/src/ports/shot-script-storage.ts`
- Create or modify: `packages/core/src/ports/shot-image-provider.ts`
- Create or modify: `packages/core/src/ports/shot-image-storage.ts`
- Create or modify: `packages/core/src/ports/shot-image-repository.ts`
- Modify: `packages/core/src/use-cases/project-detail-dto.ts`
- Modify: `packages/core/src/use-cases/project-summary-dto.ts`
- Create or replace the shot-script and images use cases needed by the new contract
- Add or update focused tests under `packages/core/tests`

### Services

- Modify: `packages/services/src/storage/*`
- Modify: `packages/services/src/providers/*shot-script*`
- Modify: `packages/services/src/providers/*image*`
- Modify: `packages/services/src/project-repository/*`
- Modify: `packages/services/src/task-repository/*`
- Create or modify SQLite repositories for grouped shot-script and segment-frame image records
- Update prompt template initialization
- Add or update focused tests under `packages/services/tests`

### API / Worker / Studio

- Modify: `apps/api/src/bootstrap/*`
- Modify or create: `apps/api/src/http/*shot-script*`
- Modify or create: `apps/api/src/http/*image*`
- Modify: `apps/worker/src/bootstrap/*`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/studio/src/components/storyboard-phase-panel.tsx`
- Modify: `apps/studio/src/components/shot-script-phase-panel.tsx`
- Create or modify: `apps/studio/src/components/image-phase-panel.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Modify: `apps/studio/src/services/api-client.ts`
- Add or update focused tests under `apps/api/tests`, `apps/worker/tests`, `apps/studio/tests`

## Constraints

- Follow `@superpowers/test-driven-development` within each chunk.
- Do not preserve the old flat `one segment = one shot` contract.
- Do not preserve the old flat `one shot = one image` contract.
- `shot_script` generation must be one AI request per segment.
- `shot_script` output must be Chinese.
- `storyboard.segment.durationSec` must stay within `<= 15`.
- This pass does not add stored standalone start/end prompt text artifacts.
- The repo baseline is not green; verify only the touched scope first, then report any unrelated failures separately.

## Chunk 1: Shared Contract Redesign

### Task 1: Replace flat shot-script types with grouped segment types

**Files:**
- Modify: `packages/shared/src/types/shot-script.ts`
- Modify: `packages/shared/src/schemas/shot-script-api.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/shot-script-api-schema.test.ts`

- [ ] **Step 1: Write the failing schema tests for grouped segment output**
- [ ] **Step 2: Run `corepack pnpm --filter @sweet-star/shared test -- shot-script-api-schema.test.ts` and confirm the old flat shape fails**
- [ ] **Step 3: Implement `CurrentShotScript.segments[]`, `ShotScriptSegment`, and grouped review payload schemas**
- [ ] **Step 4: Re-run the focused shared test and confirm it passes**
- [ ] **Step 5: Commit with `feat: redesign shot script shared contract around segments`**

### Task 2: Replace per-shot image contracts with per-segment frame contracts

**Files:**
- Modify: `packages/shared/src/types/shot-image.ts`
- Modify: `packages/shared/src/schemas/image-api.ts`
- Modify: `packages/shared/src/schemas/project-api.ts`
- Modify: `packages/shared/src/types/project-detail.ts`
- Modify: `packages/shared/src/types/project-summary.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/image-api-schema.test.ts`
- Test: `packages/shared/tests/project-api-schema.test.ts`

- [ ] **Step 1: Write the failing schema tests for `start_frame` and `end_frame` segment records**
- [ ] **Step 2: Run `corepack pnpm --filter @sweet-star/shared test -- image-api-schema.test.ts project-api-schema.test.ts` and confirm current contracts fail**
- [ ] **Step 3: Implement `CurrentImageBatchSummary` and segment-frame response schemas**
- [ ] **Step 4: Re-run the focused shared tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: redesign image shared contract around segment frames`**

### Task 3: Expand enums and route payloads for the new task model

**Files:**
- Modify: `packages/shared/src/constants/task-type.ts`
- Modify: `packages/shared/src/constants/project-status.ts`
- Modify: `packages/shared/src/schemas/shot-script-api.ts`
- Modify: `packages/shared/src/schemas/image-api.ts`
- Test: `packages/shared/tests/task-api-schema.test.ts`

- [ ] **Step 1: Write failing tests for `shot_script_segment_generate` and `segment_frames_generate`**
- [ ] **Step 2: Run `corepack pnpm --filter @sweet-star/shared test -- task-api-schema.test.ts`**
- [ ] **Step 3: Add new task types, segment review requests, and approve-all payloads**
- [ ] **Step 4: Re-run the task schema test and confirm it passes**
- [ ] **Step 5: Commit with `feat: add segment-first task enums and route payloads`**

## Chunk 2: Shot Script Core Redesign

### Task 4: Redesign shot-script domain helpers and task input snapshots

**Files:**
- Modify: `packages/core/src/domain/task.ts`
- Modify: `packages/core/src/domain/shot-script.ts`
- Modify: `packages/core/src/ports/shot-script-storage.ts`
- Modify: `packages/core/src/ports/shot-script-provider.ts`
- Test: `packages/core/tests/create-shot-script-generate-task.test.ts`

- [ ] **Step 1: Write failing tests for batch task plus per-segment task input**
- [ ] **Step 2: Run `corepack pnpm --filter @sweet-star/core test -- create-shot-script-generate-task.test.ts`**
- [ ] **Step 3: Introduce `shot_script_segment_generate` queue names, grouped task input, and segment shell creation helpers**
- [ ] **Step 4: Re-run the focused core test and confirm it passes**
- [ ] **Step 5: Commit with `feat: add shot script segment task model`**

### Task 5: Implement per-segment generation and grouped current artifact updates

**Files:**
- Modify or create: `packages/core/src/use-cases/process-shot-script-generate-task.ts`
- Create or modify: `packages/core/src/use-cases/process-shot-script-segment-generate-task.ts`
- Modify: `packages/core/src/use-cases/get-current-shot-script.ts`
- Test: `packages/core/tests/process-shot-script-generate-task.test.ts`
- Test: `packages/core/tests/process-shot-script-segment-generate-task.test.ts`
- Test: `packages/core/tests/get-current-shot-script.test.ts`

- [ ] **Step 1: Write failing tests proving batch generation creates segment placeholders and each segment task only mutates one segment**
- [ ] **Step 2: Run the three focused core tests and confirm failure**
- [ ] **Step 3: Implement batch orchestration, per-segment processing, grouped shot aggregation, and duration validation**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: process shot script one segment at a time`**

### Task 6: Implement segment-level review, manual save, and approve-all

**Files:**
- Modify: `packages/core/src/use-cases/get-shot-script-review.ts`
- Modify or create: `packages/core/src/use-cases/save-human-shot-script-segment.ts`
- Modify: `packages/core/src/use-cases/approve-shot-script.ts`
- Modify: `packages/core/src/use-cases/reject-shot-script.ts` or replace with segment actions
- Create or modify: `packages/core/src/use-cases/approve-all-shot-script-segments.ts`
- Test: `packages/core/tests/get-shot-script-review.test.ts`
- Test: `packages/core/tests/save-human-shot-script-segment.test.ts`
- Test: `packages/core/tests/approve-shot-script-segment.test.ts`
- Test: `packages/core/tests/approve-all-shot-script-segments.test.ts`

- [ ] **Step 1: Write failing tests for per-segment save, regenerate, approve, and all-approved project transition**
- [ ] **Step 2: Run the focused review tests and confirm failure**
- [ ] **Step 3: Implement segment-scoped review actions and project status rollup**
- [ ] **Step 4: Re-run the focused review tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: add shot script segment review flow`**

## Chunk 3: Provider, Template, And Validation Fixes

### Task 7: Replace the old shot-script prompt template with a segment-first Chinese template

**Files:**
- Modify: `prompt-templates/shot_script.generate.txt` or replace with `prompt-templates/shot_script.segment.generate.txt`
- Modify: `packages/services/src/storage/*prompt*`
- Test: `packages/services/tests/default-shot-script-prompt-template.test.ts`

- [ ] **Step 1: Write failing tests that assert the effective template references one segment, Chinese output, and multi-shot constraints**
- [ ] **Step 2: Run `corepack pnpm --filter @sweet-star/services test -- default-shot-script-prompt-template.test.ts`**
- [ ] **Step 3: Implement the new default template and project override initialization**
- [ ] **Step 4: Re-run the focused services test and confirm it passes**
- [ ] **Step 5: Commit with `feat: add segment-first chinese shot script template`**

### Task 8: Tighten Gemini provider parsing and validation around grouped Chinese output

**Files:**
- Modify: `packages/services/src/providers/gemini-shot-script-provider.ts`
- Modify: `packages/core/src/ports/shot-script-provider.ts`
- Test: `packages/services/tests/gemini-shot-script-provider.test.ts`
- Test: `packages/core/tests/process-shot-script-segment-generate-task.test.ts`

- [ ] **Step 1: Write failing tests for Chinese grouped output parsing, invalid English output rejection, and duration mismatch rejection**
- [ ] **Step 2: Run the focused services/core tests and confirm failure**
- [ ] **Step 3: Implement provider prompt contract changes, stronger normalization, and semantic validation**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: validate grouped chinese shot script output`**

## Chunk 4: API, Worker, And Studio Shot Script Review

### Task 9: Expose segment-first shot-script API routes and worker wiring

**Files:**
- Modify or create: `apps/api/src/http/*shot-script*`
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/worker/src/bootstrap/build-spec2-worker-services.ts`
- Modify: `apps/worker/src/index.ts`
- Test: `apps/api/tests/shot-script-api.test.ts`
- Test: `apps/worker/tests/shot-script-worker.integration.test.ts`

- [ ] **Step 1: Write failing API/worker tests for segment save, segment regenerate, segment approve, and approve-all**
- [ ] **Step 2: Run the focused API/worker tests and confirm failure**
- [ ] **Step 3: Wire the new routes, processors, and queue registrations**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: wire segment-first shot script api and worker flow`**

### Task 10: Replace the flat studio shot-script workspace with per-segment review cards

**Files:**
- Modify: `apps/studio/src/components/shot-script-phase-panel.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Modify: `apps/studio/src/services/api-client.ts`
- Test: `apps/studio/tests/integration/shot-script-phase-panel.test.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write failing studio tests asserting that each storyboard segment renders its own shot-script card and multiple shots can appear inside a card**
- [ ] **Step 2: Run the focused studio tests and confirm failure**
- [ ] **Step 3: Implement segment cards, per-segment actions, and top-level approve-all**
- [ ] **Step 4: Re-run the focused studio tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: redesign shot script studio review by segment`**

## Chunk 5: Image Stage Refactor From Shot Image To Segment Frames

### Task 11: Redesign image storage, repository, and batch creation around segment frame pairs

**Files:**
- Modify: `packages/core/src/domain/shot-image.ts`
- Modify: `packages/core/src/ports/shot-image-storage.ts`
- Modify: `packages/core/src/ports/shot-image-repository.ts`
- Modify: `packages/core/src/use-cases/create-images-generate-task.ts`
- Modify: `packages/core/src/use-cases/process-images-generate-task.ts`
- Modify: `packages/services/src/storage/image-storage.ts`
- Modify: `packages/services/src/image-repository/*`
- Test: `packages/core/tests/create-images-generate-task.test.ts`
- Test: `packages/core/tests/process-images-generate-task.test.ts`
- Test: `packages/services/tests/image-storage.test.ts`
- Test: `packages/services/tests/sqlite-image-repository.test.ts`

- [ ] **Step 1: Write failing tests proving that each segment creates exactly two current records: `start_frame` and `end_frame`**
- [ ] **Step 2: Run the focused core/services tests and confirm failure**
- [ ] **Step 3: Implement batch manifest changes, segment-frame storage layout, and repository queries**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: redesign image stage around segment frames`**

### Task 12: Generate and review images one segment at a time

**Files:**
- Create or modify: `packages/core/src/use-cases/process-segment-frames-generate-task.ts`
- Modify: `packages/core/src/use-cases/list-images.ts`
- Modify: `packages/core/src/use-cases/get-image.ts`
- Modify: `packages/core/src/use-cases/regenerate-image.ts` or replace with segment action
- Modify: `packages/core/src/use-cases/approve-image.ts` or replace with segment action
- Modify: `packages/services/src/providers/*image*`
- Modify or create: `apps/api/src/http/*image*`
- Modify: `apps/worker/src/index.ts`
- Test: `packages/core/tests/process-segment-frames-generate-task.test.ts`
- Test: `apps/api/tests/image-api.test.ts`
- Test: `apps/worker/tests/image-worker.integration.test.ts`

- [ ] **Step 1: Write failing tests for one segment request generating two frames and one segment approval completing that segment only**
- [ ] **Step 2: Run the focused core/API/worker tests and confirm failure**
- [ ] **Step 3: Implement per-segment frame generation, per-segment regenerate, per-segment approve, and approve-all**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: add segment frame generation and review flow`**

### Task 13: Update the studio image workspace to show start/end frames per segment

**Files:**
- Create or modify: `apps/studio/src/components/image-phase-panel.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Modify: `apps/studio/src/services/api-client.ts`
- Test: `apps/studio/tests/integration/image-phase-panel.test.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write failing studio tests asserting that every segment card shows two frames and supports per-segment regenerate/approve**
- [ ] **Step 2: Run the focused studio tests and confirm failure**
- [ ] **Step 3: Implement the segment-frame UI and actions**
- [ ] **Step 4: Re-run the focused tests and confirm they pass**
- [ ] **Step 5: Commit with `feat: redesign image studio workspace by segment`**

## Chunk 6: Verification

### Task 14: Run focused verification for touched packages

**Files:**
- No code changes expected

- [ ] **Step 1: Run the shared verification suite for the updated shot-script and image contracts**
- [ ] **Step 2: Run the focused core tests for shot-script segment generation/review and segment-frame image generation/review**
- [ ] **Step 3: Run the focused services tests for templates, providers, storage, and SQLite repositories**
- [ ] **Step 4: Run the focused API, worker, and studio tests for the new routes and workspaces**

### Task 15: Run repo-level verification on the non-green baseline and record unrelated failures

**Files:**
- No code changes expected

- [ ] **Step 1: Run `corepack pnpm typecheck`**
- [ ] **Step 2: Run the broadest feasible test command without masking known baseline failures**
- [ ] **Step 3: Review `git diff` and confirm the changes are limited to the approved segment-first redesign**
- [ ] **Step 4: Record any unrelated pre-existing failures separately from the new work**
