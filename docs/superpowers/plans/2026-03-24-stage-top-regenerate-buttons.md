# Stage Top Regenerate Buttons Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all stage-level top actions to `重新生成`, enforce previous-stage-approved enable rules, and add review-page regenerate actions that return to the project detail page.

**Architecture:** Reuse the existing stage task-creation and reject/regenerate flows instead of introducing a new backend abstraction. Most work stays in the Studio UI layer: update project-detail phase panels, tighten enable conditions, add review-page header actions, and expand integration coverage around navigation and disabled states.

**Tech Stack:** React, React Router, TypeScript, Vitest, Testing Library

---

## File Structure

- Modify: `apps/studio/src/pages/project-detail-page.tsx`
  - centralize stage-level enable rules and keep task polling behavior intact
- Modify: `apps/studio/src/components/master-plot-phase-panel.tsx`
  - change top button label to `重新生成`
- Modify: `apps/studio/src/components/character-sheets-phase-panel.tsx`
  - change top button label to `重新生成`
- Modify: `apps/studio/src/components/storyboard-phase-panel.tsx`
  - change top button label to `重新生成`
- Modify: `apps/studio/src/components/shot-script-phase-panel.tsx`
  - change top button label to `重新生成`
- Modify: `apps/studio/src/components/image-phase-panel.tsx`
  - change top button label to `重新生成`
- Modify: `apps/studio/src/pages/master-plot-review-page.tsx`
  - add top-level regenerate action that preserves current save/approve/reject behavior
- Modify: `apps/studio/src/pages/review-workspace-page.tsx`
  - add top-level regenerate action for storyboard review
- Modify: `apps/studio/src/pages/shot-script-review-page.tsx`
  - add top-level whole-stage regenerate action
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`
  - update wording assertions and stage enable rules
- Test: `apps/studio/tests/integration/project-review-page.test.tsx`
  - add or update review-page header regenerate coverage
- Test: `apps/studio/tests/integration/review-actions.test.tsx`
  - cover successful regenerate actions and navigation back to project detail

## Chunk 1: Project Detail Stage Buttons

### Task 1: Update master plot button wording

**Files:**
- Modify: `apps/studio/src/components/master-plot-phase-panel.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or update a test assertion that the master-plot top button renders `重新生成` even when the project has never generated a master plot.

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: FAIL because the current button text is `生成主情节`.

- [ ] **Step 3: Write minimal implementation**

Change the master-plot phase panel top action label from `生成主情节` / loading variant to `重新生成` / `启动中...`.

```tsx
{creatingTask ? "启动中..." : "重新生成"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: PASS for the updated wording assertion.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/components/master-plot-phase-panel.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: unify master plot top action wording"
```

### Task 2: Update character, storyboard, shot script, and image button wording

**Files:**
- Modify: `apps/studio/src/components/character-sheets-phase-panel.tsx`
- Modify: `apps/studio/src/components/storyboard-phase-panel.tsx`
- Modify: `apps/studio/src/components/shot-script-phase-panel.tsx`
- Modify: `apps/studio/src/components/image-phase-panel.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Update assertions so each stage panel expects `重新生成` instead of stage-specific `生成...` labels.

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: FAIL on the existing stage-specific button names.

- [ ] **Step 3: Write minimal implementation**

Replace the top-stage button labels in the four panels with `重新生成`, preserving the existing loading labels.

```tsx
{creatingTask ? "启动中..." : "重新生成"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: PASS for the updated wording assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/components/character-sheets-phase-panel.tsx apps/studio/src/components/storyboard-phase-panel.tsx apps/studio/src/components/shot-script-phase-panel.tsx apps/studio/src/components/image-phase-panel.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: unify stage top action labels"
```

### Task 3: Tighten stage enable rules in project detail

**Files:**
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests that enforce:

- shot-script top regenerate is enabled only from `storyboard_approved`
- stage-top regenerate buttons remain disabled when previous-stage approval is missing

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeDisabled();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: FAIL because shot-script generation is currently allowed from later shot-script statuses.

- [ ] **Step 3: Write minimal implementation**

Update `canGenerateShotScript` and any dependent `disableGenerate` logic so stage-top actions are enabled only when the previous stage is approved.

```ts
function canGenerateShotScript(project: ProjectDetail | null) {
  return project?.status === "storyboard_approved";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`
Expected: PASS for the tightened enable-rule coverage.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/project-detail-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "fix: align stage regenerate eligibility with approvals"
```

## Chunk 2: Review Page Header Regenerate Actions

### Task 4: Add top-level regenerate to master plot review

**Files:**
- Modify: `apps/studio/src/pages/master-plot-review-page.tsx`
- Test: `apps/studio/tests/integration/project-review-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that verifies the page renders a top-level `重新生成` button, prompts for reason, calls `apiClient.rejectMasterPlot`, and navigates back to `/projects/:projectId`.

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-review-page.test.tsx`
Expected: FAIL because no top-level regenerate button exists.

- [ ] **Step 3: Write minimal implementation**

Add a compact warning-style top action that reuses the existing reject/regenerate flow and returns to project detail on success.

```tsx
await apiClient.rejectMasterPlot(projectId, { reason });
navigate(`/projects/${projectId}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-review-page.test.tsx`
Expected: PASS for the regenerate action flow.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/master-plot-review-page.tsx apps/studio/tests/integration/project-review-page.test.tsx
git commit -m "feat: add master plot review regenerate action"
```

### Task 5: Add top-level regenerate to storyboard review

**Files:**
- Modify: `apps/studio/src/pages/review-workspace-page.tsx`
- Test: `apps/studio/tests/integration/project-review-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that verifies storyboard review renders `重新生成`, calls `apiClient.rejectStoryboard`, and navigates back to project detail.

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-review-page.test.tsx`
Expected: FAIL because storyboard review does not expose the top-level action.

- [ ] **Step 3: Write minimal implementation**

Add a compact warning-style top action gated by `!hasChanges`.

```tsx
await apiClient.rejectStoryboard(projectId, {});
navigate(`/projects/${projectId}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-review-page.test.tsx`
Expected: PASS for the storyboard regenerate flow.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/review-workspace-page.tsx apps/studio/tests/integration/project-review-page.test.tsx
git commit -m "feat: add storyboard review regenerate action"
```

### Task 6: Add top-level regenerate to shot script review

**Files:**
- Modify: `apps/studio/src/pages/shot-script-review-page.tsx`
- Test: `apps/studio/tests/integration/review-actions.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that verifies shot-script review renders a top-level `重新生成` button, calls `apiClient.createShotScriptGenerateTask`, and navigates back to project detail.

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- review-actions.test.tsx`
Expected: FAIL because only segment-level regenerate exists today.

- [ ] **Step 3: Write minimal implementation**

Add a whole-stage top action that is disabled when there are dirty segments and otherwise starts a new shot-script generation task.

```tsx
await apiClient.createShotScriptGenerateTask(projectId);
navigate(`/projects/${projectId}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- review-actions.test.tsx`
Expected: PASS for the new whole-stage regenerate flow.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/shot-script-review-page.tsx apps/studio/tests/integration/review-actions.test.tsx
git commit -m "feat: add shot script review regenerate action"
```

## Chunk 3: Regression Coverage And Final Verification

### Task 7: Add disabled-state review coverage for unsaved edits

**Files:**
- Modify: `apps/studio/tests/integration/project-review-page.test.tsx`
- Modify: `apps/studio/tests/integration/review-actions.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that top-level `重新生成` is disabled when:

- master plot review has unsaved changes
- storyboard review has unsaved changes
- shot script review has dirty segments

```tsx
expect(screen.getByRole("button", { name: "重新生成" })).toBeDisabled();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-review-page.test.tsx review-actions.test.tsx`
Expected: FAIL before the disabled-state rules are implemented or asserted.

- [ ] **Step 3: Write minimal implementation**

Use existing local dirty-state booleans to disable the new regenerate buttons.

```tsx
disabled={submittingAction || hasChanges}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-review-page.test.tsx review-actions.test.tsx`
Expected: PASS for unsaved-edit guardrails.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/tests/integration/project-review-page.test.tsx apps/studio/tests/integration/review-actions.test.tsx apps/studio/src/pages/master-plot-review-page.tsx apps/studio/src/pages/review-workspace-page.tsx apps/studio/src/pages/shot-script-review-page.tsx
git commit -m "test: cover regenerate disabled states on review pages"
```

### Task 8: Run focused studio verification

**Files:**
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`
- Test: `apps/studio/tests/integration/project-review-page.test.tsx`
- Test: `apps/studio/tests/integration/review-actions.test.tsx`

- [ ] **Step 1: Run focused integration suite**

Run:

```bash
corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx project-review-page.test.tsx review-actions.test.tsx
```

Expected: PASS with all updated wording, enable rules, and navigation assertions.

- [ ] **Step 2: Run broader studio test suite if the focused tests pass**

Run:

```bash
corepack pnpm --filter @sweet-star/studio test
```

Expected: PASS, or document unrelated pre-existing failures if any appear.

- [ ] **Step 3: Run typecheck for touched frontend code**

Run:

```bash
corepack pnpm typecheck
```

Expected: PASS for the touched Studio code paths.

- [ ] **Step 4: Commit final integrated changes**

```bash
git add apps/studio/src/pages/project-detail-page.tsx apps/studio/src/components/master-plot-phase-panel.tsx apps/studio/src/components/character-sheets-phase-panel.tsx apps/studio/src/components/storyboard-phase-panel.tsx apps/studio/src/components/shot-script-phase-panel.tsx apps/studio/src/components/image-phase-panel.tsx apps/studio/src/pages/master-plot-review-page.tsx apps/studio/src/pages/review-workspace-page.tsx apps/studio/src/pages/shot-script-review-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx apps/studio/tests/integration/project-review-page.test.tsx apps/studio/tests/integration/review-actions.test.tsx
git commit -m "feat: unify stage top regenerate actions"
```
