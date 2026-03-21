# Project Phase Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stacked project detail page with a left-side phase navigation and right-side phase workspace while preserving the current premise and master-plot behavior.

**Architecture:** Keep `/projects/:projectId` as the only detail route for this iteration. Store the currently selected phase in `ProjectDetailPage`, extract focused presentational components for the phase navigation and phase panels, and reuse the existing data-loading and task-polling logic unchanged.

**Tech Stack:** React 18, React Router, TypeScript, Tailwind utility classes, Vitest, Testing Library

---

## File Map

- Modify: `apps/studio/src/pages/project-detail-page.tsx`
  - Keep API loading, active-task creation, polling hooks, and top-level error handling.
  - Add current-phase state and the two-column workspace shell.
- Create: `apps/studio/src/components/project-phase-nav.tsx`
  - Render the left-side workflow list.
  - Own visual states for active, enabled, and disabled phases.
- Create: `apps/studio/src/components/premise-phase-panel.tsx`
  - Render the current project summary and premise metadata.
- Create: `apps/studio/src/components/master-plot-phase-panel.tsx`
  - Render generate action, task status, generating notice, master-plot summary, and review entry.
- Modify: `apps/studio/tests/integration/project-detail-page.test.tsx`
  - Cover default phase selection, phase switching, disabled future phases, and preserved master-plot flows.

## Constraints

- Follow `@superpowers/test-driven-development` while implementing each chunk.
- Do not change backend contracts, routes, or status enums.
- Do not implement future phase content beyond disabled placeholders in the navigation.
- Keep the existing `/projects/:projectId/review` route and link to it from the `主情节` panel.

## Chunk 1: Phase Workspace Shell

### Task 1: Define the phase model in the detail page

**Files:**
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing navigation test**

```tsx
it("shows the phase navigation with premise selected by default", async () => {
  vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "前提" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  expect(screen.getByRole("button", { name: "主情节" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL because the detail page still renders a stacked layout and has no phase navigation buttons.

- [ ] **Step 3: Add the phase constants and selected-phase state**

```tsx
type ProjectPhaseKey = "premise" | "master_plot" | "storyboard" | "shot_script" | "image" | "final";

const PROJECT_PHASES = [
  { key: "premise", label: "前提", enabled: true },
  { key: "master_plot", label: "主情节", enabled: true },
  { key: "storyboard", label: "分镜", enabled: false },
  { key: "shot_script", label: "镜头脚本", enabled: false },
  { key: "image", label: "出图", enabled: false },
  { key: "final", label: "成片", enabled: false },
] as const;

const [selectedPhase, setSelectedPhase] = useState<ProjectPhaseKey>("premise");
```

- [ ] **Step 4: Run the targeted test to confirm the new state wiring is still incomplete**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL because the phase buttons are still not rendered.

- [ ] **Step 5: Commit the state scaffold**

```bash
git add apps/studio/src/pages/project-detail-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "refactor: add project detail phase state scaffold"
```

### Task 2: Extract the left-side phase navigation component

**Files:**
- Create: `apps/studio/src/components/project-phase-nav.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing phase-switch test**

```tsx
it("switches to the master-plot panel when the user clicks 主情节", async () => {
  vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "主情节" }));

  expect(screen.getByRole("heading", { name: "主情节工作区" })).toBeInTheDocument();
  expect(screen.queryByText("项目 ID")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL because there is no navigation component and no phase-specific workspace heading.

- [ ] **Step 3: Create `project-phase-nav.tsx`**

```tsx
interface ProjectPhaseNavProps {
  phases: readonly { key: string; label: string; enabled: boolean }[];
  selectedPhase: string;
  onSelect: (phaseKey: string) => void;
}

export function ProjectPhaseNav({ phases, selectedPhase, onSelect }: ProjectPhaseNavProps) {
  return (
    <nav aria-label="项目阶段">
      {phases.map((phase) => (
        <button
          key={phase.key}
          type="button"
          disabled={!phase.enabled}
          aria-current={selectedPhase === phase.key ? "page" : undefined}
          onClick={() => onSelect(phase.key)}
        >
          {phase.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Replace the single-column shell with a two-column workspace**

```tsx
<div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
  <ProjectPhaseNav
    phases={PROJECT_PHASES}
    selectedPhase={selectedPhase}
    onSelect={setSelectedPhase}
  />
  <section>{/* active phase panel */}</section>
</div>
```

- [ ] **Step 5: Run the targeted test to verify the shell now passes**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: PASS for the navigation and phase-switch assertions that do not depend on extracted panels yet.

- [ ] **Step 6: Commit the navigation shell**

```bash
git add apps/studio/src/components/project-phase-nav.tsx apps/studio/src/pages/project-detail-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: add project phase navigation shell"
```

### Task 3: Extract the premise panel and disable future phases

**Files:**
- Create: `apps/studio/src/components/premise-phase-panel.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Write the failing disabled-phase test**

```tsx
it("keeps future phases disabled and ignores clicks on them", async () => {
  vi.spyOn(apiModule.apiClient, "getProjectDetail").mockResolvedValue(baseProject);

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "分镜" })).toBeDisabled();
  });

  fireEvent.click(screen.getByRole("button", { name: "分镜" }));

  expect(screen.getByRole("heading", { name: "前提工作区" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL because the current panel headings and disabled-phase behavior are not finished.

- [ ] **Step 3: Create `premise-phase-panel.tsx` and move the premise content into it**

```tsx
export function PremisePhasePanel({ project }: { project: ProjectDetail }) {
  return (
    <div>
      <h2>前提工作区</h2>
      <StatusBadge status={project.status} />
      <p>项目 ID</p>
      <p>{project.id}</p>
      <p>项目前提</p>
      <p>{project.premise.path}</p>
    </div>
  );
}
```

- [ ] **Step 4: Render `PremisePhasePanel` when `selectedPhase === "premise"`**

```tsx
{selectedPhase === "premise" ? (
  <PremisePhasePanel project={currentProject} />
) : (
  <MasterPlotPhasePanel ... />
)}
```

- [ ] **Step 5: Run the targeted test to verify the disabled behavior and premise panel**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: PASS for default premise rendering and disabled future-phase coverage.

- [ ] **Step 6: Commit the premise panel extraction**

```bash
git add apps/studio/src/components/premise-phase-panel.tsx apps/studio/src/pages/project-detail-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "refactor: extract premise phase panel"
```

## Chunk 2: Master-Plot Workspace Preservation

### Task 4: Extract the master-plot panel without changing behavior

**Files:**
- Create: `apps/studio/src/components/master-plot-phase-panel.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`

- [ ] **Step 1: Update the existing generation test to enter the `主情节` phase first**

```tsx
await waitFor(() => {
  expect(screen.getByRole("button", { name: "主情节" })).toBeInTheDocument();
});

fireEvent.click(screen.getByRole("button", { name: "主情节" }));
fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: FAIL because the `主情节` phase panel content is not wired yet.

- [ ] **Step 3: Create `master-plot-phase-panel.tsx` with the existing master-plot cards**

```tsx
interface MasterPlotPhasePanelProps {
  project: ProjectDetail;
  task: TaskDetail | null;
  taskError: Error | null;
  creatingTask: boolean;
  onGenerate: () => void;
}

export function MasterPlotPhasePanel(props: MasterPlotPhasePanelProps) {
  return (
    <div>
      <h2>主情节工作区</h2>
      <button onClick={props.onGenerate}>生成主情节</button>
      {/* existing task status, generating notice, current master plot summary */}
    </div>
  );
}
```

- [ ] **Step 4: Change the review CTA label to phase-specific wording**

```tsx
<Link to={`/projects/${project.id}/review`}>
  进入主情节审核 →
</Link>
```

- [ ] **Step 5: Run the targeted test to verify the generation flow passes again**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: PASS for generation, task state rendering, and review-entry assertions updated to the new label.

- [ ] **Step 6: Commit the master-plot panel extraction**

```bash
git add apps/studio/src/components/master-plot-phase-panel.tsx apps/studio/src/pages/project-detail-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx
git commit -m "feat: move master plot workflow into phase panel"
```

### Task 5: Re-run the polling and failure coverage inside the new phase shell

**Files:**
- Modify: `apps/studio/tests/integration/project-detail-page.test.tsx`
- Modify: `apps/studio/src/pages/project-detail-page.tsx` only if a test exposes a regression

- [ ] **Step 1: Update the polling-success and polling-failure tests to switch to `主情节` before asserting**

```tsx
fireEvent.click(screen.getByRole("button", { name: "主情节" }));

await act(async () => {
  pollTimer?.();
  await flushMicrotasks();
});

expect(screen.getByRole("link", { name: /进入主情节审核/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted test file**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: PASS. If it fails, only make the minimal render or state fix needed to restore existing behavior inside the `主情节` phase.

- [ ] **Step 3: Commit the preserved integration coverage**

```bash
git add apps/studio/tests/integration/project-detail-page.test.tsx apps/studio/src/pages/project-detail-page.tsx
git commit -m "test: cover project detail phase navigation flow"
```

## Chunk 3: Verification

### Task 6: Run the focused studio verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run the focused detail-page integration suite**

Run: `corepack pnpm --filter @sweet-star/studio test -- project-detail-page.test.tsx`

Expected: PASS with the new navigation and preserved master-plot flows.

- [ ] **Step 2: Run the full studio test suite**

Run: `corepack pnpm --filter @sweet-star/studio test`

Expected: PASS. If unrelated failures appear, document them before touching anything outside this feature.

- [ ] **Step 3: Run studio type checking**

Run: `corepack pnpm --filter @sweet-star/studio typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Review the changed files before completion**

Run:

```bash
git diff -- apps/studio/src/pages/project-detail-page.tsx
git diff -- apps/studio/src/components/project-phase-nav.tsx
git diff -- apps/studio/src/components/premise-phase-panel.tsx
git diff -- apps/studio/src/components/master-plot-phase-panel.tsx
git diff -- apps/studio/tests/integration/project-detail-page.test.tsx
```

Expected: the diff only reflects the approved phase-navigation redesign and review-entry relabeling.

- [ ] **Step 5: Run `@superpowers/verification-before-completion` before reporting success**

Required evidence to capture in the execution notes:
- targeted test command output
- full studio test command output
- typecheck output
- any intentional deviations from the plan

