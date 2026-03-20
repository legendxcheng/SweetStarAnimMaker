# WebUI Simplified Chinese Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Scope:** `apps/studio` WebUI copy only

---

## Summary

Convert the current English-facing studio WebUI into a Simplified Chinese experience for end users. The implementation should directly replace existing visible English copy with Chinese text and keep the current component structure, routes, API contracts, and internal status enums unchanged.

---

## Design Decisions

### Translation Strategy
- Directly replace existing hard-coded English UI strings with Simplified Chinese.
- Do not introduce an i18n library, locale resource files, or a translation abstraction layer.
- Keep the implementation scoped to the current Chinese-only product direction.

### Scope of Localization
- Translate page titles, navigation labels, buttons, loading copy, empty states, form labels, placeholders, dialog text, status display labels, fallback copy, and not-found content in `apps/studio`.
- Change `apps/studio/index.html` `lang` from `en` to `zh-CN`.
- Format user-visible dates and datetimes with a Chinese locale so the UI does not keep emitting English date strings.

### Data and Protocol Boundaries
- Do not translate user-authored content such as project names, plot titles, or story text returned from the backend.
- Do not change route paths, API field names, backend payloads, or internal enum values like `master_plot_in_review`.
- Keep backend-provided raw error messages unchanged for this pass; only front-end wrapper text and surrounding UI copy move to Chinese.

---

## Affected UI Areas

### App Shell
- Sidebar brand text
- Navigation labels
- New project CTA
- Not-found fallback route text

### Shared Components
- `AsyncState` loading fallback
- `ErrorState` title and retry button
- `StatusBadge` visible labels for known project statuses

### Pages
- `ProjectsPage` title, empty-state message, empty-state CTA, updated label
- `NewProjectPage` title, labels, placeholders, submit/loading/cancel buttons
- `ProjectDetailPage` back button, metadata labels, generation button/loading text, task status section, generation-in-progress notice, current master plot labels, review-entry CTA
- `ReviewWorkspacePage` toolbar text, action buttons, latest review label, form labels, reject dialog, placeholders, alerts, and confirms

---

## Translation Rules

- Use Simplified Chinese consistently across the full WebUI.
- Keep wording short and operational rather than literary.
- Preserve domain terms that are already product concepts, but translate their visible labels:
  - `Master Plot` -> `主情节`
  - `Logline` -> `一句话梗概`
  - `Synopsis` -> `剧情简介`
  - `Main Characters` -> `主要角色`
- Keep internal identifiers untouched even when the visible label changes.

---

## Testing Strategy

- Update existing `apps/studio/tests/integration` assertions that currently depend on English UI text.
- Add or extend tests so key user-facing Chinese copy is verified on the main pages and major flow entry points.
- Follow TDD for the behavior change:
  - change a targeted test to expect Chinese text
  - run it and verify it fails for the expected reason
  - implement the minimal UI copy change
  - rerun the targeted test until it passes
- Run the relevant `apps/studio` Vitest integration coverage after the copy migration is complete.

---

## Files Expected To Change

| File | Change |
|---|---|
| `apps/studio/index.html` | Set document language to `zh-CN` |
| `apps/studio/src/app/layout.tsx` | Translate shell and fallback route copy |
| `apps/studio/src/components/async-state.tsx` | Translate loading fallback |
| `apps/studio/src/components/error-state.tsx` | Translate error title and retry button |
| `apps/studio/src/components/status-badge.tsx` | Translate visible status labels |
| `apps/studio/src/pages/projects-page.tsx` | Translate page and empty-state copy; localize updated date label |
| `apps/studio/src/pages/new-project-page.tsx` | Translate form copy |
| `apps/studio/src/pages/project-detail-page.tsx` | Translate project detail and task status copy; localize date output |
| `apps/studio/src/pages/review-workspace-page.tsx` | Translate review workspace copy, confirms, alerts, and dialog text |
| `apps/studio/tests/integration/*.test.tsx` | Update affected assertions to Chinese |

---

## Out of Scope

- No multi-language support
- No i18n dependency or message catalog
- No backend localization
- No change to business logic, API schemas, route structure, or status enum values
- No redesign beyond wording updates required by localization
