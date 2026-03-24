# Shot Script Canonical Character Names Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce canonical approved character names during shot script generation and human review saves so downstream image planning receives stable identity references.

**Architecture:** Keep the fix at the shot-script generation stage by tightening the segment prompt template and adding a shared canonical-name validator. Run that validator in both the Gemini shot-script provider and the human-save use case, with limited provider retries when generated output violates the contract.

**Tech Stack:** TypeScript, Vitest, Fastify storage/use-case stack, prompt templates

---

## Chunk 1: Canonical Name Rules and Prompt Contract

### Task 1: Add prompt-template coverage for canonical character-name instructions

**Files:**
- Modify: `prompt-templates/shot_script.segment.generate.txt`
- Modify: `apps/api/tests/prompt-template-test-helper.ts`
- Test: `packages/services/tests/default-shot-script-prompt-template.test.ts`

- [ ] **Step 1: Write the failing template assertions**
- [ ] **Step 2: Run the targeted template test to verify it fails**
  Run: `pnpm vitest packages/services/tests/default-shot-script-prompt-template.test.ts`
- [ ] **Step 3: Update the prompt template to render approved character guidance**
- [ ] **Step 4: Re-run the targeted template test to verify it passes**

### Task 2: Add a shared canonical-name validator test first

**Files:**
- Create: `packages/core/src/domain/shot-script-canonical-character-validator.ts`
- Create: `packages/core/tests/shot-script-canonical-character-validator.test.ts`

- [ ] **Step 1: Write failing validator tests for canonical names, alias rejection, and generic-label rejection**
- [ ] **Step 2: Run the targeted core test to verify it fails**
  Run: `pnpm vitest packages/core/tests/shot-script-canonical-character-validator.test.ts`
- [ ] **Step 3: Implement the minimal shared validator**
- [ ] **Step 4: Re-run the targeted core test to verify it passes**

## Chunk 2: Gemini Provider Validation and Retry

### Task 3: Add failing provider tests for validation and retry

**Files:**
- Modify: `packages/services/tests/gemini-shot-script-provider.test.ts`
- Modify: `packages/services/src/providers/gemini-shot-script-provider.ts`

- [ ] **Step 1: Add a failing test that rejects shorthand aliases such as `K` when `职员K` is approved**
- [ ] **Step 2: Add a failing test that retries with correction feedback and succeeds on the second response**
- [ ] **Step 3: Add a failing test that errors after the retry budget is exhausted**
- [ ] **Step 4: Run the targeted provider tests to verify they fail**
  Run: `pnpm vitest packages/services/tests/gemini-shot-script-provider.test.ts`

### Task 4: Implement provider-side canonical validation

**Files:**
- Modify: `packages/services/src/providers/gemini-shot-script-provider.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Read `characterSheets` from provider variables and invoke the shared validator after payload normalization**
- [ ] **Step 2: Add correction-prompt retry handling with a max of 2 retries**
- [ ] **Step 3: Export any new shared validator types/functions needed by services**
- [ ] **Step 4: Re-run the targeted provider tests to verify they pass**

## Chunk 3: Human Save Validation

### Task 5: Add failing human-save tests

**Files:**
- Modify: `packages/core/tests/save-human-shot-script-segment.test.ts`
- Modify: `packages/core/src/use-cases/save-human-shot-script-segment.ts`

- [ ] **Step 1: Add a failing test that rejects manual save input using `K` instead of `职员K`**
- [ ] **Step 2: Add a passing coverage case for canonical approved names if missing**
- [ ] **Step 3: Run the targeted save-use-case test to verify the new invalid case fails**
  Run: `pnpm vitest packages/core/tests/save-human-shot-script-segment.test.ts`

### Task 6: Reuse the shared validator in the human-save flow

**Files:**
- Modify: `packages/core/src/use-cases/save-human-shot-script-segment.ts`
- Modify: `packages/core/src/domain/shot-script-canonical-character-validator.ts`

- [ ] **Step 1: Load current approved character context available to the save flow**
- [ ] **Step 2: Validate edited shots before writing a human version**
- [ ] **Step 3: Return a clear validation error when canonical-name rules are violated**
- [ ] **Step 4: Re-run the targeted save-use-case test to verify it passes**

## Chunk 4: Wiring and Regression Verification

### Task 7: Confirm shot-script segment generation still receives character-sheet context

**Files:**
- Modify: `packages/core/tests/process-shot-script-segment-generate-task.test.ts`
- Modify: `packages/core/src/use-cases/process-shot-script-segment-generate-task.ts`

- [ ] **Step 1: Add or tighten a test that verifies `characterSheets` reach the prompt/provider path**
- [ ] **Step 2: Run the targeted process-shot-script-segment test**
  Run: `pnpm vitest packages/core/tests/process-shot-script-segment-generate-task.test.ts`

### Task 8: Run focused regression verification

**Files:**
- Verify only

- [ ] **Step 1: Run canonical validator tests**
  Run: `pnpm vitest packages/core/tests/shot-script-canonical-character-validator.test.ts`
- [ ] **Step 2: Run provider tests**
  Run: `pnpm vitest packages/services/tests/gemini-shot-script-provider.test.ts`
- [ ] **Step 3: Run human-save tests**
  Run: `pnpm vitest packages/core/tests/save-human-shot-script-segment.test.ts`
- [ ] **Step 4: Run shot-script process tests**
  Run: `pnpm vitest packages/core/tests/process-shot-script-segment-generate-task.test.ts`
- [ ] **Step 5: Report any unrelated pre-existing failures separately if encountered**
