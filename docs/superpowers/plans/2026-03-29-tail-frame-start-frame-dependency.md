# Tail Frame Start Frame Dependency Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make end-frame generation depend on an existing start-frame image, reuse that start-frame image as an end-frame reference, and give end-frame prompt planning explicit start-frame continuity context.

**Architecture:** Keep the existing single-frame generation API and shot image provider, but make the workflow shot-aware at both the studio and core layers. The studio blocks invalid single-frame actions and submits batch generation in `start -> end` order per shot, while the backend enforces the dependency and enriches end-frame generation with the start-frame image and prompt context.

**Tech Stack:** TypeScript, React, Vitest, Testing Library

---

## Chunk 1: Studio Dependency UX

### Task 1: Add failing studio integration coverage for end-frame dependency blocking

**Files:**
- Modify: `apps/studio/tests/integration/image-phase-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

Add an integration test that renders a `start_and_end_frame` shot with:
- `startFrame.imageAssetPath = null`
- `endFrame.imageAssetPath = null`
- planned prompts on both frames

Assert that:
- `生成结束帧图片` is disabled
- the end-frame card shows `请先生成首帧，尾帧会自动引用首帧结果图以保持一致性。`
- `生成起始帧图片` remains enabled

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- image-phase-panel.test.tsx`
Expected: FAIL because the end-frame generate button is still enabled and the dependency message does not exist.

### Task 2: Implement the frame-card dependency guard

**Files:**
- Modify: `apps/studio/src/components/image-phase-panel/types.ts`
- Modify: `apps/studio/src/components/image-phase-panel/frame-editor-card.tsx`
- Modify: `apps/studio/src/components/image-phase-panel.tsx`

- [ ] **Step 1: Extend frame-card props with start-frame dependency state**

Add explicit props that let the card know:
- whether this frame is blocked by a missing start-frame image
- what dependency message to render when blocked

- [ ] **Step 2: Render the dependency message and disable only the invalid end-frame generate action**

In `frame-editor-card.tsx`:
- keep prompt save/regenerate behavior unchanged
- disable `生成结束帧图片` when the new dependency prop is true
- render the agreed inline explanation under the action row

- [ ] **Step 3: Compute and pass the dependency state from the panel**

In `image-phase-panel.tsx`:
- detect blocked end frames from the owning shot data
- pass the computed flag/message into the end-frame card only

- [ ] **Step 4: Re-run the focused studio test**

Run: `corepack pnpm --filter @sweet-star/studio test -- image-phase-panel.test.tsx`
Expected: PASS for the new dependency-blocking case, with any remaining failures limited to batch-ordering coverage not yet updated.

## Chunk 2: Studio Batch Ordering

### Task 3: Add failing studio coverage for shot-aware batch generation order

**Files:**
- Modify: `apps/studio/tests/integration/image-phase-panel.test.tsx`

- [ ] **Step 1: Write the failing batch-order test**

Update or extend the batch generation test so it:
- loads at least one `start_and_end_frame` shot
- clicks `重新生成全部帧`
- asserts `generateImageFrame` is called for the shot's start frame before its end frame

Add another case that:
- loads a `start_and_end_frame` shot whose start frame has no image
- asserts the batch run submits only the start frame and skips the end frame

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- image-phase-panel.test.tsx`
Expected: FAIL because batch generation still iterates over flat frames instead of shot-aware ordering and skip logic.

### Task 4: Make batch frame generation shot-aware

**Files:**
- Modify: `apps/studio/src/components/image-phase-panel.tsx`

- [ ] **Step 1: Refactor the batch handler to iterate by shot**

Implement minimal logic that:
- loops over `shots`, not the flattened `frames`
- always submits `shot.startFrame`
- submits `shot.endFrame` only when:
  - it exists
  - the start frame currently has `imageAssetPath`

- [ ] **Step 2: Keep existing busy and refresh behavior intact**

Preserve:
- `actionBusy = "generate-all-frames"`
- sequential `await` submission
- project refresh after submission
- image list refresh after submission
- existing `actionError` handling

- [ ] **Step 3: Re-run the focused studio test**

Run: `corepack pnpm --filter @sweet-star/studio test -- image-phase-panel.test.tsx`
Expected: PASS

## Chunk 3: Backend End-Frame Guard And Reference Enrichment

### Task 5: Add failing backend tests for invalid end-frame generation and appended start-frame reference

**Files:**
- Modify: `packages/core/tests/process-frame-image-generate-task.test.ts`

- [ ] **Step 1: Write a failing guard test**

Add a test where:
- the resolved frame is `end_frame`
- the owning shot exists
- the shot's `startFrame.imageAssetPath` is `null`

Assert that:
- the use case rejects with a clear error
- `shotImageProvider.generateShotImage` is not called

- [ ] **Step 2: Write a failing reference-enrichment test**

Add a test where:
- the resolved frame is `end_frame`
- the owning shot start frame has `imageAssetPath`
- the end frame already has matched character reference images

Assert that `generateShotImage` receives:
- the original character reference image paths
- the resolved current start-frame image path appended last

- [ ] **Step 3: Run the focused backend test to verify both fail**

Run: `corepack pnpm --filter @sweet-star/core test -- process-frame-image-generate-task.test.ts`
Expected: FAIL because the current use case neither rejects missing start-frame images nor appends the start-frame image to `referenceImagePaths`.

### Task 6: Implement backend end-frame validation and reference-image assembly

**Files:**
- Modify: `packages/core/src/use-cases/process-frame-image-generate-task.ts`

- [ ] **Step 1: Derive end-frame start-frame dependency from the resolved shot**

When the resolved frame is `end_frame` and the owning shot exists:
- read `shot.startFrame.imageAssetPath`
- reject if it is missing

- [ ] **Step 2: Build the provider reference image list**

For normal start-frame generation:
- keep the existing matched character reference image behavior

For end-frame generation:
- resolve matched character reference image paths as today
- resolve the shot start-frame current image path relative to project storage
- append it to the provider `referenceImagePaths`

- [ ] **Step 3: Re-run the focused backend test**

Run: `corepack pnpm --filter @sweet-star/core test -- process-frame-image-generate-task.test.ts`
Expected: PASS

## Chunk 4: End-Frame Prompt Context

### Task 7: Add failing tests for end-frame `startFrameContext`

**Files:**
- Modify: `packages/core/tests/process-frame-prompt-generate-task.test.ts`
- Modify: `packages/services/tests/gemini-frame-prompt-provider.test.ts`
- Modify: `packages/services/tests/grok-frame-prompt-provider.test.ts`

- [ ] **Step 1: Write a failing core use-case test**

Add a test where the target frame is `end_frame` and the owning shot has a populated start frame.

Assert that `framePromptProvider.generateFramePrompt` receives `startFrameContext` with:
- `promptTextCurrent`
- `selectedCharacterIds`
- `imageStatus`
- `imageAssetPath`

- [ ] **Step 2: Write failing provider prompt-text assertions**

Update the Gemini and Grok provider tests so `end_frame` requests assert the generated request text contains:
- `"startFrameContext"`
- continuity instructions tying `end_frame` to the start frame

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/core test -- process-frame-prompt-generate-task.test.ts`
Run: `corepack pnpm --filter @sweet-star/services test -- gemini-frame-prompt-provider.test.ts grok-frame-prompt-provider.test.ts`
Expected: FAIL because the prompt-provider input contract and prompt template do not yet include `startFrameContext`.

### Task 8: Implement `startFrameContext` in the prompt-generation path

**Files:**
- Modify: `packages/core/src/ports/frame-prompt-provider.ts`
- Modify: `packages/core/src/use-cases/process-frame-prompt-generate-task.ts`
- Modify: `packages/services/src/providers/frame-prompt-template.ts`

- [ ] **Step 1: Extend the frame-prompt provider input type**

Add an optional `startFrameContext` object with exactly:
- `promptTextCurrent`
- `selectedCharacterIds`
- `imageStatus`
- `imageAssetPath`

- [ ] **Step 2: Pass `startFrameContext` only for `end_frame`**

In `process-frame-prompt-generate-task.ts`:
- when generating `end_frame`, construct the context from `shot.startFrame`
- when generating `start_frame`, omit the field

- [ ] **Step 3: Update the prompt template**

In `frame-prompt-template.ts`:
- include `startFrameContext` in the serialized context block when present
- strengthen `end_frame` rules to require continuity with the start frame and emphasize result-state change instead of paraphrase

- [ ] **Step 4: Re-run the focused tests**

Run: `corepack pnpm --filter @sweet-star/core test -- process-frame-prompt-generate-task.test.ts`
Run: `corepack pnpm --filter @sweet-star/services test -- gemini-frame-prompt-provider.test.ts grok-frame-prompt-provider.test.ts`
Expected: PASS

## Chunk 5: Final Verification

### Task 9: Run verification for the touched areas

**Files:**
- No code changes; verification only

- [ ] **Step 1: Run the studio integration suite for the touched panel**

Run: `corepack pnpm --filter @sweet-star/studio test -- image-phase-panel.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the focused core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- process-frame-image-generate-task.test.ts process-frame-prompt-generate-task.test.ts`
Expected: PASS

- [ ] **Step 3: Run the focused services provider tests**

Run: `corepack pnpm --filter @sweet-star/services test -- gemini-frame-prompt-provider.test.ts grok-frame-prompt-provider.test.ts`
Expected: PASS

- [ ] **Step 4: Run typecheck if the touched packages require it**

Run: `corepack pnpm --filter @sweet-star/studio typecheck`
Expected: PASS
