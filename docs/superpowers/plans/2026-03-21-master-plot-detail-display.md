# Master Plot Detail Display Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the master-plot card in the `主情节工作区` so users can read the full generated master-plot details without leaving the page or expanding a collapsed view.

**Architecture:** Keep the existing project phase workspace unchanged and limit the production change to `MasterPlotPhasePanel`. Continue using the current `CurrentMasterPlot` shape, but render summary fields, long-form narrative fields, and metadata in more readable sections. Add integration tests for both the new full-detail content and the fallback display values.

**Tech Stack:** React 18, TypeScript, Tailwind utility classes, Vitest, Testing Library

---

## File Map

- Modify: `apps/studio/src/components/master-plot-phase-panel.tsx`
  - Expand the current master-plot card from summary-only to full-detail display.
  - Add local formatting for fallback values and target duration display.
- Modify: `apps/studio/tests/integration/project-detail-page.test.tsx`
  - Add assertions for long-form master-plot fields and fallback rendering.

## Constraints

- Follow `@superpowers/test-driven-development`.
- Do not change routes, review behavior, or the phase navigation.
- Do not add collapse state or edit controls.
- Do not change backend contracts or shared API types.

## Chunk 1: Detail Coverage

### Task 1: Add failing integration coverage for full detail fields

**Files:**
- Modify: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Add a failing test for full master-plot detail rendering**

```tsx
it("shows the full current master-plot details in the 主情节 workspace", async () => {
  vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(reviewedProject);

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "主情节" }));

  expect(screen.getByText("剧情简介")).toBeInTheDocument();
  expect(screen.getByText(reviewedProject.currentMasterPlot.synopsis)).toBeInTheDocument();
  expect(screen.getByText("核心冲突")).toBeInTheDocument();
  expect(screen.getByText(reviewedProject.currentMasterPlot.coreConflict)).toBeInTheDocument();
  expect(screen.getByText("情感弧光")).toBeInTheDocument();
  expect(screen.getByText(reviewedProject.currentMasterPlot.emotionalArc)).toBeInTheDocument();
  expect(screen.getByText("结局落点")).toBeInTheDocument();
  expect(screen.getByText(reviewedProject.currentMasterPlot.endingBeat)).toBeInTheDocument();
  expect(screen.getByText("目标时长")).toBeInTheDocument();
  expect(screen.getByText("480 秒")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL because the current master-plot card still omits synopsis, core conflict, emotional arc, ending beat, and target duration.

- [ ] **Step 3: Add a failing fallback test**

```tsx
it("shows master-plot fallback values for missing title, characters, and duration", async () => {
  vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue({
    ...reviewedProject,
    currentMasterPlot: {
      ...reviewedProject.currentMasterPlot,
      title: null,
      mainCharacters: [],
      targetDurationSec: null,
    },
  });

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "主情节" }));

  expect(screen.getByText("未命名")).toBeInTheDocument();
  expect(screen.getByText("暂无")).toBeInTheDocument();
  expect(screen.getByText("未设置")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the targeted test again to verify the fallback assertions also fail**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL for the new missing detail and fallback behavior.

- [ ] **Step 5: Commit the failing test additions**

```bash
git add apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "test: cover full master plot detail display"
```

## Chunk 2: Full Detail Rendering

### Task 2: Expand the current master-plot card

**Files:**
- Modify: `apps/studio/src/components/master-plot-phase-panel.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Add local formatting helpers for fallback values**

```tsx
function formatCharacters(characters: string[]) {
  return characters.length > 0 ? characters.join("，") : "暂无";
}

function formatDuration(durationSec: number | null) {
  return durationSec === null ? "未设置" : `${durationSec} 秒`;
}
```

- [ ] **Step 2: Replace the compact grid with a readable detail layout**

```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
  <div className="grid gap-4">
    {/* 标题 / 一句话梗概 / 主要角色 */}
  </div>
  <div className="grid gap-4">
    {/* 剧情简介 / 核心冲突 / 情感弧光 / 结局落点 */}
  </div>
</div>
<div className="mt-5 grid gap-3 sm:grid-cols-2">
  {/* 目标时长 / 更新时间 */}
</div>
```

- [ ] **Step 3: Render long-form narrative fields as readable body text**

```tsx
<div>
  <p className={metaLabelClass}>剧情简介</p>
  <p className="text-sm leading-7 text-(--color-text-primary)">
    {project.currentMasterPlot.synopsis}
  </p>
</div>
```

- [ ] **Step 4: Run the targeted integration test**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: PASS with the new detail and fallback assertions.

- [ ] **Step 5: Commit the display update**

```bash
git add apps/studio/src/components/master-plot-phase-panel.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: show full master plot details in phase panel"
```

## Chunk 3: Verification

### Task 3: Run focused verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run the studio test suite**

Run: `corepack pnpm --filter @sweet-star/studio test`

Expected: PASS for all studio integration and e2e tests.

- [ ] **Step 2: Run studio typecheck**

Run: `corepack pnpm --filter @sweet-star/studio typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Review the diff**

Run:

```bash
git diff -- apps/studio/src/components/master-plot-phase-panel.tsx
git diff -- apps/studio/tests/integration/project-detail-page.test.tsx
```

Expected: only the approved full-detail rendering and matching test updates are present.

- [ ] **Step 4: Run `@superpowers/verification-before-completion` before reporting success**

Required evidence to capture:
- targeted project detail test output
- full studio test output
- typecheck output
