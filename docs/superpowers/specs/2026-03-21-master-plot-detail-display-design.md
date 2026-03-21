# Master Plot Detail Display Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Scope:** `apps/studio` master-plot phase display only

---

## Summary

The current `主情节工作区` shows only a summary of the generated master plot. Users can see the title, logline, main characters, and update time, but cannot directly read the rest of the generated narrative content.

This change upgrades the current master-plot card from a summary card into a readable full-detail card so users can assess the generated result before deciding whether to enter review.

---

## Design Decisions

### Display Strategy
- Keep the current `主情节工作区` layout and navigation structure.
- Do not introduce expand/collapse behavior.
- Do not create a separate detail page.
- Show the full master-plot content by default inside the existing current-master-plot card.

### Content Scope
- The current master-plot card should display:
  - `标题`
  - `一句话梗概`
  - `主要角色`
  - `剧情简介`
  - `核心冲突`
  - `情感弧光`
  - `结局落点`
  - `目标时长`
  - `更新时间`
- The existing review entry stays at the top-right of the card when the project is in `master_plot_in_review`.

### Readability Rules
- Keep short summary fields and long narrative fields visually distinct.
- Use a two-column information layout inside the card:
  - left side for summary fields
  - right side for long-form narrative fields
- Long-form fields should be rendered as readable paragraph content rather than compact metadata rows.
- Keep target duration and update time in a separate low-density metadata area.

### Empty-State Rules
- `标题` falls back to `未命名` when null.
- `主要角色` falls back to `暂无` when the array is empty.
- `目标时长` falls back to `未设置` when null.
- Existing non-null fields such as `logline`, `synopsis`, `coreConflict`, `emotionalArc`, and `endingBeat` continue to render directly.

---

## Implementation Boundaries

- Limit production changes to the master-plot display component.
- Reuse the current `CurrentMasterPlot` data shape from `packages/shared`.
- Do not change API contracts, routing, or review behavior.
- Do not add edit controls, rich formatting, or collapse state.

---

## Testing Strategy

- Extend `apps/studio/tests/integration/project-detail-page.test.tsx`.
- Add coverage that, after switching to `主情节`, verifies the current master-plot card shows:
  - `剧情简介`
  - `核心冲突`
  - `情感弧光`
  - `结局落点`
  - target duration text
- Add at least one fallback assertion for null or empty display values, such as:
  - null title -> `未命名`
  - null target duration -> `未设置`

---

## Files Expected To Change

| File | Change |
|---|---|
| `apps/studio/src/components/master-plot-phase-panel.tsx` | Expand the current master-plot card into a full-detail display |
| `apps/studio/tests/integration/project-detail-page.test.tsx` | Add integration coverage for full-detail rendering and fallbacks |

---

## Out of Scope

- No navigation changes
- No review-workspace changes
- No backend changes
- No field editing
- No expand/collapse interaction
- No typography overhaul beyond local readability improvements inside the card
