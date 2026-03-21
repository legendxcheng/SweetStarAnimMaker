# Project Phase Navigation Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Scope:** `apps/studio` project detail information architecture and navigation only

---

## Summary

Replace the current long vertically stacked project detail page with a phase-oriented workspace. After selecting a project, the page should present the workflow as a left-side phase navigation and a right-side phase work area.

The first implementation pass should establish the workflow shell and move existing content into the correct phase panels without redesigning backend state models or implementing future phases.

---

## Design Decisions

### Navigation Structure
- Replace the current single-column stacked detail layout with a two-column layout.
- The left column is a phase navigation for the project workflow.
- The right column renders one active phase panel at a time.
- Do not use top tabs for this workflow. The approved direction is a left-side phase navigation.

### Phase List
- The first version should display these phases in order:
  - `前提`
  - `主情节`
  - `分镜`
  - `镜头脚本`
  - `出图`
  - `成片`
- Only `前提` and `主情节` are enabled in the first version.
- Remaining phases are visible for roadmap clarity but disabled and not clickable.

### Review Model
- Review is not a project-level top navigation item.
- Review belongs inside each phase as a phase-specific action or section.
- In the first version, the existing `主情节` review page remains in place as a transitional implementation.
- The `主情节` phase panel should expose a more accurate entry such as `进入主情节审核`.

### Routing Strategy
- Keep the project detail workflow inside the existing `/projects/:projectId` page for the first version.
- Do not split each phase into separate routes yet.
- Preserve the existing `/projects/:projectId/review` route for the current master-plot review workflow.

### Backward-Compatible Scope
- Reuse the existing project detail data loading, task creation, and task polling behavior.
- Rehouse existing UI sections into phase panels rather than rewriting business logic.
- Do not change backend payloads, project status enums, or review APIs in this task.

---

## Phase Panel Content

### `前提`
- Show the current project identity and premise-related metadata that already exists on the detail page:
  - project status
  - project id
  - slug
  - premise file path and byte size
  - created time
  - updated time
- This panel becomes the home for future premise editing actions, but no new premise editing feature is required now.

### `主情节`
- Move all existing master-plot workflow content into this panel:
  - generate master plot action
  - task status card
  - generating notice
  - current master plot summary
  - review entry action
- Keep the current polling and refresh behavior unchanged.
- Treat the review entry as the review action for this phase, not for the whole project.

### Future Phases
- `分镜`
- `镜头脚本`
- `出图`
- `成片`

These phases are navigation placeholders only in the first version. They should appear disabled in the phase list and should not switch the active panel.

---

## Interaction Rules

- Default active phase is `前提`.
- Clicking an enabled phase switches the right-side panel without a page navigation.
- Clicking a disabled phase does nothing.
- The active phase is visually highlighted in the left navigation.
- Disabled phases are visually distinct from enabled phases.
- The page title and the existing back-to-project-list action remain available.

---

## Component Boundaries

- Keep `ProjectDetailPage` focused on:
  - loading project detail
  - creating master-plot tasks
  - polling active task state
  - holding the currently selected phase
- Introduce a focused left navigation component, for example `ProjectPhaseNav`.
- Introduce focused right-panel components, for example:
  - `PremisePhasePanel`
  - `MasterPlotPhasePanel`
- Follow the existing `apps/studio` pattern and avoid unnecessary route or state abstraction.

---

## Testing Strategy

- Extend the existing project detail integration coverage rather than replacing it.
- Add assertions for:
  - left-side phase navigation rendering
  - default selection of `前提`
  - switching to `主情节`
  - disabled future phases not being interactive
- Keep master-plot generation and task-polling coverage intact, but exercise it from the `主情节` panel context.
- Do not add tests for unimplemented future phases beyond disabled-state coverage.

---

## Files Expected To Change

| File | Change |
|---|---|
| `apps/studio/src/pages/project-detail-page.tsx` | Replace stacked layout with phase workspace shell and phase selection state |
| `apps/studio/src/pages/project-detail-page.tsx` or new colocated components | Extract premise and master-plot phase panels if needed |
| `apps/studio/tests/integration/project-detail-page.test.tsx` | Update detail-page coverage for phase navigation and preserved master-plot behavior |

Optional new files if the split improves clarity:

| File | Change |
|---|---|
| `apps/studio/src/components/project-phase-nav.tsx` | Render left-side phase navigation |
| `apps/studio/src/components/premise-phase-panel.tsx` | Render premise workspace content |
| `apps/studio/src/components/master-plot-phase-panel.tsx` | Render master-plot workspace content |

---

## Out of Scope

- No backend schema or API changes
- No new review data model
- No per-phase routing system
- No functional implementation for `分镜`, `镜头脚本`, `出图`, or `成片`
- No global cross-phase review dashboard
- No redesign of the dedicated review workspace beyond relabeling its entry point from the project detail page
