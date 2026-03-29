# Tail Frame Start Frame Dependency Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Scope:** `apps/studio`, `packages/core`, `packages/services`, `packages/shared`

---

## Summary

The image workspace currently treats start-frame and end-frame image generation as two independent frame actions. Prompt generation differentiates `start_frame` and `end_frame` semantically, but actual image generation only passes matched character reference images to the shot image provider.

This leaves two gaps for `start_and_end_frame` shots:

- users can trigger end-frame generation before a start-frame image exists
- end-frame generation does not use the generated start-frame image as a visual continuity anchor

This change introduces a strong dependency for end-frame generation:

- single end-frame generation is blocked until the start frame has an image
- backend generation also rejects end-frame requests when the start frame has no image
- end-frame image generation appends the shot's start-frame result image to the provider reference image list
- batch generation runs per shot, always submitting `start -> end` for `start_and_end_frame` shots
- end-frame prompt generation receives explicit `startFrameContext` so the prompt provider can plan continuity against the actual start frame prompt state

---

## Design Decisions

### Single End-Frame Guard

- In the studio image phase panel, `生成结束帧图片` must be disabled when:
  - the frame is an `end_frame`
  - the owning shot uses `start_and_end_frame`
  - the shot's `startFrame.imageAssetPath` is missing
- The end-frame card must show a clear inline explanation:
  - `请先生成首帧，尾帧会自动引用首帧结果图以保持一致性。`
- This is a product guard, not just a convenience; the UI should steer users toward the intended workflow.

### Backend Enforcement

- The image-generation use case must also reject invalid end-frame requests when the owning shot's start frame has no current image.
- UI-only enforcement is insufficient because the same API can be called from other entry points or scripts.
- The backend error should be specific enough for logs and test assertions, for example:
  - `Cannot generate end frame before start frame image exists: <frameId>`

### End-Frame Reference Images

- End-frame image generation should continue to use matched character reference images.
- For `end_frame`, append the owning shot's current start-frame image path to the provider `referenceImagePaths`.
- Reference path ordering should be:
  - matched character reference images first
  - start-frame result image last
- `start_frame` generation remains unchanged.

### Batch Generation Ordering

- The existing studio batch action `重新生成全部帧` should change from flat frame iteration to shot-aware iteration.
- For `start_frame_only` shots:
  - submit only the start frame
- For `start_and_end_frame` shots:
  - submit the start frame first
  - submit the end frame second
- The batch action should still submit sequentially, not in parallel.
- Sequential shot-aware ordering is enough; the studio does not need to wait for the start-frame task to finish before it submits the end-frame task, because the backend guard only depends on an existing start-frame image, not task completion inside the same batch click.
- However, when the loaded shot state shows no start-frame image, the studio batch action must skip that shot's end-frame request and only submit the start frame.

### End-Frame Prompt Planning

- End-frame prompt generation should explicitly know the current start-frame planning state for the same shot.
- Extend the frame prompt input contract with an optional `startFrameContext` used only for `end_frame`.
- `startFrameContext` should contain:
  - `promptTextCurrent`
  - `selectedCharacterIds`
  - `imageStatus`
  - `imageAssetPath`
- The prompt template should add continuity rules for `end_frame`:
  - keep the same shot's character styling, costume, subject count, camera logic, base environment, and dominant light-color direction continuous with the start frame
  - express the result or emotional landing of the shot, not a paraphrase of the start frame
  - use `startFrameContext.promptTextCurrent` as the continuity anchor when present

### Data Contract Changes

- `packages/core` prompt-provider port needs a new optional `startFrameContext`.
- `packages/services` prompt template builders and provider tests need to include the new context.
- Shared DTOs for image frames do not need new persisted fields because the start-frame context is assembled from already stored frame data at prompt-generation time.

---

## UX Details

### Frame Card Behavior

- Start-frame cards behave exactly as they do today.
- End-frame cards without a start-frame image:
  - disable the generate button
  - keep prompt editing and prompt regeneration available
  - show the inline dependency message
- End-frame cards with a start-frame image:
  - enable generation normally
  - continue showing matched character references
  - do not need to display the start-frame image thumbnail in the card for this change

### Batch Action Behavior

- The batch action remains visible in the top image workspace action row.
- The action still uses the shared busy state and existing project/frame refresh flow.
- During a batch run:
  - the batch button is disabled
  - per-frame generate buttons are disabled
  - other existing batch-sensitive actions continue to respect the shared busy state

---

## Error Handling

- If the backend rejects an end-frame request because the start frame has no image, the error should surface through the existing `actionError` path in the studio.
- If a batch run encounters a rejection on one frame:
  - keep the current behavior of surfacing the error and stopping the remaining sequential requests
- If the start frame already has an older accepted image, that image is valid as the end-frame reference source.
- If the start frame is regenerated later, the next end-frame generation should automatically use the newest current start-frame image.

---

## Testing Strategy

### Studio Integration Coverage

- Add a failing test that renders a `start_and_end_frame` shot whose start frame has no image and verifies:
  - the end-frame generate button is disabled
  - the inline dependency message is shown
- Update batch generation coverage to verify:
  - requests are made in shot-aware order
  - start frame is always requested before end frame for the same shot
  - end-frame requests are skipped when the loaded start frame has no image

### Core Use Case Coverage

- Add a failing test that verifies end-frame generation rejects when the owning shot has no start-frame image.
- Add a failing test that verifies end-frame generation appends the shot start-frame image to `referenceImagePaths`.
- Keep start-frame generation coverage unchanged.

### Prompt Provider Coverage

- Update frame prompt provider tests to verify `end_frame` requests include:
  - `startFrameContext`
  - the new continuity rules in the prompt text
- Verify `start_frame` requests do not require `startFrameContext`.

---

## Files Expected To Change

| File | Change |
|---|---|
| `apps/studio/src/components/image-phase-panel.tsx` | Make batch frame generation shot-aware and pass shot context into frame cards |
| `apps/studio/src/components/image-phase-panel/frame-editor-card.tsx` | Disable single end-frame generation when the start frame has no image and show the dependency message |
| `apps/studio/src/components/image-phase-panel/types.ts` | Extend frame-card props with start-frame dependency state |
| `apps/studio/tests/integration/image-phase-panel.test.tsx` | Add single-card dependency coverage and update batch ordering assertions |
| `packages/core/src/ports/frame-prompt-provider.ts` | Add optional `startFrameContext` to the prompt provider input |
| `packages/core/src/use-cases/process-frame-prompt-generate-task.ts` | Build and pass start-frame context for end-frame prompt generation |
| `packages/core/src/use-cases/process-frame-image-generate-task.ts` | Enforce the start-frame image guard and append the start-frame image path for end-frame generation |
| `packages/core/tests/process-frame-prompt-generate-task.test.ts` | Cover `startFrameContext` assembly for end-frame prompt generation |
| `packages/core/tests/process-frame-image-generate-task.test.ts` | Cover backend guard and appended reference image behavior |
| `packages/services/src/providers/frame-prompt-template.ts` | Encode end-frame continuity rules and interpolate `startFrameContext` |
| `packages/services/tests/gemini-frame-prompt-provider.test.ts` | Verify prompt text includes new end-frame continuity context |
| `packages/services/tests/grok-frame-prompt-provider.test.ts` | Verify prompt text includes new end-frame continuity context |

---

## Out Of Scope

- No new persisted frame fields
- No automatic end-frame regeneration after a later start-frame regeneration
- No UI for previewing the start-frame image inside the end-frame card
- No new backend batch image-generation endpoint
