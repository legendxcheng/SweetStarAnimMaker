# WebUI Simplified Chinese Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing `apps/studio` WebUI from English-facing copy to Simplified Chinese without introducing an i18n layer or changing business logic.

**Architecture:** Keep the current React/Vite structure intact and directly replace visible English UI strings in-place. Update tests first, then implement the minimal component/page copy changes required to satisfy them, while preserving routes, API contracts, and internal enum values.

**Tech Stack:** React 18, React Router 7, TypeScript, Vitest, Testing Library, Vite

---

## File Structure Map

- `apps/studio/index.html`
  Purpose: document shell metadata, including the root HTML `lang` attribute.
- `apps/studio/src/app/layout.tsx`
  Purpose: app shell brand, nav labels, CTA labels.
- `apps/studio/src/app/router.tsx`
  Purpose: route-level not-found fallback copy.
- `apps/studio/src/components/async-state.tsx`
  Purpose: default loading fallback copy.
- `apps/studio/src/components/error-state.tsx`
  Purpose: shared error title and retry CTA.
- `apps/studio/src/components/status-badge.tsx`
  Purpose: project status labels visible across pages.
- `apps/studio/src/pages/projects-page.tsx`
  Purpose: projects list title, empty state, updated date label.
- `apps/studio/src/pages/new-project-page.tsx`
  Purpose: project creation form labels, placeholders, action buttons.
- `apps/studio/src/pages/project-detail-page.tsx`
  Purpose: project detail metadata labels, generation status copy, review CTA, localized date rendering.
- `apps/studio/src/pages/review-workspace-page.tsx`
  Purpose: review workspace labels, action buttons, alerts, confirms, dialog text.
- `apps/studio/tests/integration/app-shell.test.tsx`
  Purpose: shell and fallback route copy assertions.
- `apps/studio/tests/integration/projects-page.test.tsx`
  Purpose: loading, empty state, and error display assertions.
- `apps/studio/tests/integration/new-project-page.test.tsx`
  Purpose: project creation form labels and CTA assertions.
- `apps/studio/tests/integration/project-detail-page.test.tsx`
  Purpose: generation flow, task status, and review CTA assertions.
- `apps/studio/tests/integration/project-review-page.test.tsx`
  Purpose: editable review field labels and save failure alert assertions.
- `apps/studio/tests/integration/review-actions.test.tsx`
  Purpose: approve/reject action copy and validation assertions.
- `apps/studio/tests/e2e/spec5-studio-flow.test.tsx`
  Purpose: full browser-like master-plot flow assertions across pages.

---

## Chunk 1: Shared Shell And Shared Copy

### Task 1: Translate shell, shared components, and document language

**Files:**
- Modify: `apps/studio/index.html`
- Modify: `apps/studio/src/app/layout.tsx`
- Modify: `apps/studio/src/app/router.tsx`
- Modify: `apps/studio/src/components/async-state.tsx`
- Modify: `apps/studio/src/components/error-state.tsx`
- Modify: `apps/studio/src/components/status-badge.tsx`
- Test: `apps/studio/tests/integration/app-shell.test.tsx`
- Test: `apps/studio/tests/integration/projects-page.test.tsx`

- [ ] **Step 1: Write the failing tests for shared Chinese copy**

Update the relevant tests so they expect Chinese-visible shell and shared copy. Include assertions such as:

```tsx
expect(screen.getByText("甜星工坊")).toBeInTheDocument();
expect(screen.getByText("未找到页面")).toBeInTheDocument();
expect(screen.getByText("加载中...")).toBeInTheDocument();
expect(screen.getByText("错误")).toBeInTheDocument();
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/app-shell.test.tsx tests/integration/projects-page.test.tsx`

Expected: FAIL because the UI still renders English strings.

- [ ] **Step 3: Write the minimal implementation**

Apply these direct copy changes:

```tsx
// apps/studio/src/app/layout.tsx
<span className="text-sm font-semibold text-(--color-text-primary)">甜星工坊</span>
...
项目列表
...
+ 新建项目
```

```tsx
// apps/studio/src/app/router.tsx
element: <div>未找到页面</div>,
```

```tsx
// apps/studio/src/components/async-state.tsx
<p className="text-sm text-(--color-text-muted)">加载中...</p>
```

```tsx
// apps/studio/src/components/error-state.tsx
<h3 className="text-sm font-semibold text-(--color-danger) mb-1">错误</h3>
...
重试
```

Translate the `StatusBadge` labels in `status-badge.tsx` to Chinese and set `apps/studio/index.html` to `lang="zh-CN"`.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/app-shell.test.tsx tests/integration/projects-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/studio/index.html apps/studio/src/app/layout.tsx apps/studio/src/app/router.tsx apps/studio/src/components/async-state.tsx apps/studio/src/components/error-state.tsx apps/studio/src/components/status-badge.tsx apps/studio/tests/integration/app-shell.test.tsx apps/studio/tests/integration/projects-page.test.tsx
git commit -m "feat: localize shared studio shell copy to chinese"
```

---

## Chunk 2: Projects And Project Detail Pages

### Task 2: Translate project list and new-project form copy

**Files:**
- Modify: `apps/studio/src/pages/projects-page.tsx`
- Modify: `apps/studio/src/pages/new-project-page.tsx`
- Test: `apps/studio/tests/integration/projects-page.test.tsx`
- Test: `apps/studio/tests/integration/new-project-page.test.tsx`
- Test: `apps/studio/tests/e2e/spec5-studio-flow.test.tsx`

- [ ] **Step 1: Write the failing tests for page-level Chinese copy**

Change assertions to Chinese labels such as:

```tsx
expect(screen.getByText("项目列表")).toBeInTheDocument();
expect(screen.getByText(/还没有项目/)).toBeInTheDocument();
fireEvent.change(screen.getByLabelText("项目名称"), {
  target: { value: "Test Project" },
});
fireEvent.click(screen.getByRole("button", { name: "创建项目" }));
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/projects-page.test.tsx tests/integration/new-project-page.test.tsx tests/e2e/spec5-studio-flow.test.tsx`

Expected: FAIL because the pages still render English labels and CTA text.

- [ ] **Step 3: Write the minimal implementation**

Directly translate the page strings:

```tsx
// apps/studio/src/pages/projects-page.tsx
<PageHeader title="项目列表" />
message="还没有项目。先创建一个项目开始使用。"
创建项目
已更新：{new Date(project.updatedAt).toLocaleDateString("zh-CN")}
```

```tsx
// apps/studio/src/pages/new-project-page.tsx
<PageHeader title="新建项目" />
项目名称
请输入项目名称
项目前提
请描述用于生成主情节的项目前提
{submitting ? "创建中..." : "创建项目"}
取消
```

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/projects-page.test.tsx tests/integration/new-project-page.test.tsx tests/e2e/spec5-studio-flow.test.tsx`

Expected: PASS for the updated page assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/projects-page.tsx apps/studio/src/pages/new-project-page.tsx apps/studio/tests/integration/projects-page.test.tsx apps/studio/tests/integration/new-project-page.test.tsx apps/studio/tests/e2e/spec5-studio-flow.test.tsx
git commit -m "feat: localize studio project creation flow to chinese"
```

### Task 3: Translate project detail copy and Chinese date rendering

**Files:**
- Modify: `apps/studio/src/pages/project-detail-page.tsx`
- Test: `apps/studio/tests/integration/project-detail-page.test.tsx`
- Test: `apps/studio/tests/e2e/spec5-studio-flow.test.tsx`

- [ ] **Step 1: Write the failing tests for project detail Chinese copy**

Update assertions to Chinese labels:

```tsx
fireEvent.click(screen.getByRole("button", { name: /生成主情节/i }));
expect(screen.getByText(/任务状态/i)).toBeInTheDocument();
expect(screen.getByRole("link", { name: /进入审核/i })).toBeInTheDocument();
expect(screen.getByText(/主情节生成中/)).toBeInTheDocument();
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/project-detail-page.test.tsx tests/e2e/spec5-studio-flow.test.tsx`

Expected: FAIL because the detail page still renders English copy.

- [ ] **Step 3: Write the minimal implementation**

Translate metadata and action strings in `project-detail-page.tsx`, and localize date output in-place:

```tsx
← 返回项目列表
项目 ID
别名
项目前提
创建时间
更新时间
{creatingTask ? "启动中..." : "生成主情节"}
任务状态
当前主情节
标题
一句话梗概
主要角色
进入审核 →
new Date(value).toLocaleString("zh-CN")
```

Also translate the generation-in-progress banner and keep backend error content unchanged.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/project-detail-page.test.tsx tests/e2e/spec5-studio-flow.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/project-detail-page.tsx apps/studio/tests/integration/project-detail-page.test.tsx apps/studio/tests/e2e/spec5-studio-flow.test.tsx
git commit -m "feat: localize studio project detail copy to chinese"
```

---

## Chunk 3: Review Workspace And Final Verification

### Task 4: Translate review workspace labels, dialogs, and alerts

**Files:**
- Modify: `apps/studio/src/pages/review-workspace-page.tsx`
- Test: `apps/studio/tests/integration/project-review-page.test.tsx`
- Test: `apps/studio/tests/integration/review-actions.test.tsx`
- Test: `apps/studio/tests/e2e/spec5-studio-flow.test.tsx`

- [ ] **Step 1: Write the failing tests for review Chinese copy**

Change assertions to Chinese labels and dialog text:

```tsx
fireEvent.change(screen.getByLabelText("标题"), {
  target: { value: "The Last Sky Choir Revised" },
});
fireEvent.click(screen.getByRole("button", { name: /保存修改/i }));
expect(globalThis.alert).toHaveBeenCalledWith("保存失败：Version conflict");
...
const approveButton = await screen.findByRole("button", { name: "通过" });
const rejectButton = screen.getByRole("button", { name: "驳回" });
fireEvent.change(screen.getByPlaceholderText(/请说明驳回原因/), {
  target: { value: "Need stronger framing" },
});
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/project-review-page.test.tsx tests/integration/review-actions.test.tsx tests/e2e/spec5-studio-flow.test.tsx`

Expected: FAIL because the review workspace still uses English copy.

- [ ] **Step 3: Write the minimal implementation**

Translate all review UI copy directly in `review-workspace-page.tsx`:

```tsx
← 返回
主情节审核
{saving ? "保存中..." : "保存修改"}
通过
驳回
最新审核：
标题
一句话梗概
剧情简介
主要角色
核心冲突
情感弧线
结局节点
目标时长（秒）
确认要通过这个主情节吗？
保存失败：${message}
通过失败：${message}
主情节已通过！
请填写驳回原因
主情节已驳回，已创建重新生成任务。
驳回主情节
原因
请说明驳回原因...
提交驳回
取消
```

Keep raw backend error payloads interpolated as-is after the Chinese prefix.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `corepack pnpm --filter @sweet-star/studio test -- tests/integration/project-review-page.test.tsx tests/integration/review-actions.test.tsx tests/e2e/spec5-studio-flow.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/studio/src/pages/review-workspace-page.tsx apps/studio/tests/integration/project-review-page.test.tsx apps/studio/tests/integration/review-actions.test.tsx apps/studio/tests/e2e/spec5-studio-flow.test.tsx
git commit -m "feat: localize studio review workspace to chinese"
```

### Task 5: Run final studio verification

**Files:**
- Modify: none
- Test: `apps/studio/tests/integration/*.test.tsx`
- Test: `apps/studio/tests/e2e/spec5-studio-flow.test.tsx`

- [ ] **Step 1: Run the full studio test suite**

Run: `corepack pnpm --filter @sweet-star/studio test`

Expected: PASS for all studio integration and e2e tests.

- [ ] **Step 2: Run studio type checking**

Run: `corepack pnpm --filter @sweet-star/studio typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Review changed files**

Run: `git status --short`

Expected: only the intended `apps/studio` and documentation files are modified.

- [ ] **Step 4: Commit final verification state**

```bash
git add apps/studio
git commit -m "test: verify chinese-localized studio ui"
```
