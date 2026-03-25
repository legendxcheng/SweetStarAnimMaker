# Video Prompt Editing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted editable video prompts, per-segment prompt regeneration, and top-level prompt/video batch actions to the Studio video phase panel.

**Architecture:** Extend the shared `SegmentVideoRecord` contract and sqlite persistence with prompt fields, add backend use cases and routes for saving/regenerating video prompts, then update Studio to use image-panel-style prompt drafts and top-level batch actions. Keep batch video regeneration as a front-end sequential orchestration over the existing per-segment regenerate endpoint.

**Tech Stack:** TypeScript, React, Vitest, Fastify, shared zod schemas, core use cases, sqlite repositories

---

## Chunk 1: Shared Contract And Persistence

### Task 1: Extend shared video DTOs and schemas

**Files:**
- Modify: `packages/shared/src/types/video.ts`
- Modify: `packages/shared/src/schemas/video-api.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/video-api-schema.test.ts`

- [ ] **Step 1: Write the failing schema tests**

```ts
expect(parsed.segments[0]?.promptTextSeed).toBe("seed prompt");
expect(parsed.segments[0]?.promptTextCurrent).toBe("current prompt");
expect(parsed.segments[0]?.promptUpdatedAt).toBe("2026-03-25T00:00:00.000Z");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/shared test -- video-api-schema.test.ts`
Expected: FAIL because the video schema does not expose prompt fields or prompt request schemas yet.

- [ ] **Step 3: Write minimal shared contract changes**

Add prompt fields to `SegmentVideoRecord` and add request schemas for:

```ts
saveVideoPromptRequestSchema
regenerateVideoPromptRequestSchema
regenerateAllVideoPromptsRequestSchema
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/shared test -- video-api-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/video.ts packages/shared/src/schemas/video-api.ts packages/shared/src/index.ts packages/shared/tests/video-api-schema.test.ts
git commit -m "feat: extend video prompt shared schema"
```

### Task 2: Persist video prompt fields in domain and sqlite repository

**Files:**
- Modify: `packages/core/src/domain/video.ts`
- Modify: `packages/services/src/video-repository/sqlite-video-repository.ts`
- Modify: `packages/services/src/project-repository/sqlite-schema.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/services/src/index.ts`
- Test: `packages/services/tests/sqlite-video-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
expect(saved.promptTextSeed).toBe("seed prompt");
expect(saved.promptTextCurrent).toBe("current prompt");
expect(saved.promptUpdatedAt).toBe("2026-03-25T00:00:00.000Z");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/services test -- sqlite-video-repository.test.ts`
Expected: FAIL because the sqlite row mapping and schema do not include prompt columns.

- [ ] **Step 3: Write minimal persistence changes**

Add `prompt_text_seed`, `prompt_text_current`, and `prompt_updated_at` to `segment_videos`, then map them through domain/entity creation and repository insert/update/read paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/services test -- sqlite-video-repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/video.ts packages/core/src/index.ts packages/services/src/video-repository/sqlite-video-repository.ts packages/services/src/project-repository/sqlite-schema.ts packages/services/src/index.ts packages/services/tests/sqlite-video-repository.test.ts
git commit -m "feat: persist video prompt fields"
```

## Chunk 2: Backend Prompt Use Cases And Routes

### Task 3: Seed persisted prompts when video records are created

**Files:**
- Modify: `packages/core/src/use-cases/process-videos-generate-task.ts`
- Modify: `packages/core/tests/process-videos-generate-task.test.ts`

- [ ] **Step 1: Write the failing use-case test**

```ts
expect(insertedSegment.promptTextSeed).toContain("prompt");
expect(insertedSegment.promptTextCurrent).toBe(insertedSegment.promptTextSeed);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/core test -- process-videos-generate-task.test.ts`
Expected: FAIL because new video segments are created without prompt fields.

- [ ] **Step 3: Write minimal implementation**

Generate the initial segment video prompt at batch-processing time and copy it into both `promptTextSeed` and `promptTextCurrent`, with `promptUpdatedAt` set to the batch start timestamp.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/core test -- process-videos-generate-task.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/process-videos-generate-task.ts packages/core/tests/process-videos-generate-task.test.ts
git commit -m "feat: seed video prompts on batch creation"
```

### Task 4: Add save/regenerate prompt use cases

**Files:**
- Create: `packages/core/src/use-cases/update-video-prompt.ts`
- Create: `packages/core/src/use-cases/regenerate-video-prompt.ts`
- Create: `packages/core/src/use-cases/regenerate-all-video-prompts.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/update-video-prompt.test.ts`
- Test: `packages/core/tests/regenerate-video-prompt.test.ts`
- Test: `packages/core/tests/regenerate-all-video-prompts.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
expect(result.promptTextCurrent).toBe("用户修改后的提示词");
expect(result.promptUpdatedAt).toBe("2026-03-25T00:10:00.000Z");
```

```ts
expect(result.promptTextCurrent).toBe("重新生成后的提示词");
```

```ts
expect(result.segments).toHaveLength(2);
expect(result.segments[0]?.promptTextCurrent).toBe("batch regenerated prompt");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/core test -- update-video-prompt.test.ts regenerate-video-prompt.test.ts regenerate-all-video-prompts.test.ts`
Expected: FAIL because the use cases do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Use the current video batch and existing prompt template/provider flow to update prompt fields only. Do not enqueue video generation here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/core test -- update-video-prompt.test.ts regenerate-video-prompt.test.ts regenerate-all-video-prompts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/update-video-prompt.ts packages/core/src/use-cases/regenerate-video-prompt.ts packages/core/src/use-cases/regenerate-all-video-prompts.ts packages/core/src/index.ts packages/core/tests/update-video-prompt.test.ts packages/core/tests/regenerate-video-prompt.test.ts packages/core/tests/regenerate-all-video-prompts.test.ts
git commit -m "feat: add video prompt use cases"
```

### Task 5: Wire API services and routes for video prompt actions

**Files:**
- Modify: `apps/api/src/bootstrap/build-spec1-services.ts`
- Modify: `apps/api/src/http/register-video-routes.ts`
- Test: `apps/api/tests/video-api.test.ts`

- [ ] **Step 1: Write the failing API route tests**

```ts
await app.inject({ method: "PUT", url: `/projects/${project.id}/videos/segments/video_segment_1/prompt`, payload: { promptTextCurrent: "新提示词" } });
await app.inject({ method: "POST", url: `/projects/${project.id}/videos/segments/video_segment_1/regenerate-prompt`, payload: {} });
await app.inject({ method: "POST", url: `/projects/${project.id}/videos/regenerate-prompts`, payload: {} });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/api test -- video-api.test.ts`
Expected: FAIL because the prompt routes are missing.

- [ ] **Step 3: Write minimal implementation**

Register the three new routes and expose the new services from API bootstrap.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/api test -- video-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/bootstrap/build-spec1-services.ts apps/api/src/http/register-video-routes.ts apps/api/tests/video-api.test.ts
git commit -m "feat: expose video prompt routes"
```

### Task 6: Make segment video generation use saved prompts

**Files:**
- Modify: `packages/core/src/use-cases/process-segment-video-generate-task.ts`
- Modify: `packages/core/tests/process-segment-video-generate-task.test.ts`

- [ ] **Step 1: Write the failing regression test**

```ts
expect(providerInput.promptText).toBe("用户保存后的当前提示词");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/core test -- process-segment-video-generate-task.test.ts`
Expected: FAIL because generation still uses prompt assembly that ignores the persisted current prompt.

- [ ] **Step 3: Write minimal implementation**

Read `promptTextCurrent` from the current segment video record during segment generation.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/core test -- process-segment-video-generate-task.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/use-cases/process-segment-video-generate-task.ts packages/core/tests/process-segment-video-generate-task.test.ts
git commit -m "fix: generate videos from saved prompts"
```

## Chunk 3: Studio Video Panel

### Task 7: Add prompt APIs to the Studio client

**Files:**
- Modify: `apps/studio/src/services/api-client.ts`
- Test: `apps/studio/tests/integration/api-client.test.ts`

- [ ] **Step 1: Write the failing client tests**

```ts
await apiClient.updateVideoPrompt("proj-1", "video-1", { promptTextCurrent: "新提示词" });
await apiClient.regenerateVideoPrompt("proj-1", "video-1");
await apiClient.regenerateAllVideoPrompts("proj-1");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- api-client.test.ts`
Expected: FAIL because the client methods do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add the three prompt-related API client methods using the new shared schemas.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- api-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/services/api-client.ts apps/studio/tests/integration/api-client.test.ts
git commit -m "feat: add studio video prompt client methods"
```

### Task 8: Add prompt editing and batch actions to the video phase panel

**Files:**
- Modify: `apps/studio/src/components/video-phase-panel.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`
- Test: `apps/studio/tests/integration/video-phase-panel.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
expect(screen.getByDisplayValue("当前视频提示词")).toBeInTheDocument();
fireEvent.change(screen.getByDisplayValue("当前视频提示词"), { target: { value: "改后的提示词" } });
expect(screen.getByRole("button", { name: "保存提示词" })).toBeEnabled();
expect(screen.getByRole("button", { name: "重新生成所有段落提示词" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "重新生成所有视频段落" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- video-phase-panel.test.tsx project-detail-page.test.tsx`
Expected: FAIL because the panel does not render prompt editors or the new actions.

- [ ] **Step 3: Write minimal implementation**

Add image-panel-style drafts, per-segment save/regenerate-prompt actions, dirty-state guarding, and top-level batch actions. Keep the regenerate-all-videos flow as sequential calls over the current `videos` list.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- video-phase-panel.test.tsx project-detail-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/components/video-phase-panel.tsx apps/studio/tests/integration/video-phase-panel.test.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: add video prompt editing panel"
```

## Chunk 4: End-To-End Verification

### Task 9: Run focused verification for all touched layers

**Files:**
- Verify only

- [ ] **Step 1: Run shared tests**

Run: `corepack pnpm --filter @sweet-star/shared test -- video-api-schema.test.ts`
Expected: PASS

- [ ] **Step 2: Run core tests**

Run: `corepack pnpm --filter @sweet-star/core test -- process-videos-generate-task.test.ts process-segment-video-generate-task.test.ts update-video-prompt.test.ts regenerate-video-prompt.test.ts regenerate-all-video-prompts.test.ts`
Expected: PASS

- [ ] **Step 3: Run services tests**

Run: `corepack pnpm --filter @sweet-star/services test -- sqlite-video-repository.test.ts`
Expected: PASS

- [ ] **Step 4: Run API tests**

Run: `corepack pnpm --filter @sweet-star/api test -- video-api.test.ts`
Expected: PASS

- [ ] **Step 5: Run Studio tests**

Run: `corepack pnpm --filter @sweet-star/studio test -- api-client.test.ts video-phase-panel.test.tsx project-detail-page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add video prompt editing workflow"
```
