# Stage Top Regenerate Buttons Design

## Summary

Unify the top-level primary action for every generatable project stage to `重新生成` across both the project detail page and the review pages. Clicking the top-level regenerate action must start the corresponding generation flow, move the project into that stage's `*_generating` status, and return the user to the project detail page.

This change is intentionally limited to stage-level actions. Existing item-level regenerate actions such as character-level regenerate, shot-script segment regenerate, and image prompt/frame regenerate remain unchanged.

## Goals

- Show `重新生成` as the top primary action for every stage that supports generation.
- Apply the same wording on the project detail page and on relevant review pages.
- Only enable the button when all previous stages are completed and approved, and there is no active generation task for the project.
- After a successful review-page regenerate action, navigate back to the project detail page.
- Reuse existing backend task creation and reject/regenerate flows where possible.

## Non-Goals

- Do not rename or remove item-level regenerate actions.
- Do not introduce a new unified backend `regenerate-stage` API.
- Do not change the underlying project status enum or stage order.
- Do not change approval semantics for existing review flows beyond exposing a distinct top-level regenerate action.

## Current Context

The current codebase already supports multiple regeneration behaviors:

- Project-detail stage generation:
  - `createMasterPlotGenerateTask`
  - `createCharacterSheetsGenerateTask`
  - `createStoryboardGenerateTask`
  - `createShotScriptGenerateTask`
  - `createImagesGenerateTask`
- Review-driven whole-stage regeneration:
  - `rejectMasterPlot`
  - `rejectStoryboard`
- Item-level regeneration:
  - `regenerateCharacterSheet`
  - `regenerateShotScriptSegment`
  - `regenerateImageFramePrompt`
  - `regenerateAllImagePrompts`

The UI already has consistent phase panels on the project detail page, which makes a wording and behavior unification practical without introducing a new screen structure.

## User-Facing Behavior

### Project Detail Page

The top primary button for each of the following panels always displays `重新生成`:

- 主情节
- 角色设定
- 分镜
- 镜头脚本
- 画面

The button is enabled only when:

- the immediately previous stage has been approved, and
- there is no active local generation task already running or pending for the project.

If the stage has never produced output before, the button still shows `重新生成`; wording no longer switches between `生成` and `重新生成`.

### Review Pages

Each relevant review page gets a top-level `重新生成` action in the page header area:

- 主情节审核页
- 分镜审核页
- 镜头脚本审核页

Behavior:

- if the regenerate action succeeds, navigate to `/projects/:projectId`
- the project detail page then reflects the corresponding `*_generating` status
- if the action fails, remain on the current review page and surface the error

Regenerate is not available while the current review page has unsaved edits:

- master plot review: `!hasChanges`
- storyboard review: `!hasChanges`
- shot script review: `!hasDirtySegments`

This avoids silently discarding local unsaved review edits.

## Button Enable Rules

### Project Detail Stage Buttons

- 主情节: enabled only when `project.status === "premise_ready"`
- 角色设定: enabled only when `project.status === "master_plot_approved"`
- 分镜: enabled only when `project.status === "character_sheets_approved"`
- 镜头脚本: enabled only when `project.status === "storyboard_approved"`
- 画面: enabled only when `project.status === "shot_script_approved"`

Additionally, all of the above are disabled if:

- `creatingTask === true`, or
- the locally tracked task is `pending` or `running`

### Review Header Buttons

- 主情节审核页: enabled when `ws.availableActions.reject && !hasChanges && !submittingAction`
- 分镜审核页: enabled when `ws.availableActions.reject && !hasChanges && !submittingAction`
- 镜头脚本审核页: enabled when `!hasDirtySegments && !approvingAll`

## API Mapping

No new backend API layer is added. The top-level UI actions map to existing flows:

### Project Detail Page

- 主情节 `重新生成` -> `apiClient.createMasterPlotGenerateTask(projectId)`
- 角色设定 `重新生成` -> `apiClient.createCharacterSheetsGenerateTask(projectId)`
- 分镜 `重新生成` -> `apiClient.createStoryboardGenerateTask(projectId)`
- 镜头脚本 `重新生成` -> `apiClient.createShotScriptGenerateTask(projectId)`
- 画面 `重新生成` -> `apiClient.createImagesGenerateTask(projectId)`

### Review Pages

- 主情节审核页 `重新生成` -> `apiClient.rejectMasterPlot(projectId, { reason })`
  - keep the existing reject-and-regenerate backend semantics
- 分镜审核页 `重新生成` -> `apiClient.rejectStoryboard(projectId, {})`
  - keep the existing reject-and-regenerate backend semantics
- 镜头脚本审核页 `重新生成` -> `apiClient.createShotScriptGenerateTask(projectId)`
  - use direct whole-stage regeneration rather than segment-level regenerate

## Design Decisions

### Keep Reject Separate From Regenerate In The UI

The review pages currently expose approval and reject-oriented actions. This change adds an explicit top-level `重新生成` action instead of renaming existing reject actions in place. The reason is that `驳回` still communicates review semantics, while `重新生成` communicates an operational outcome the user can deliberately trigger.

For master plot and storyboard review pages, the implementation may still call reject-style backend use cases, but the UI should present the intended user action as `重新生成`.

### Do Not Unify Item-Level Controls

Character-level, segment-level, and frame-level regenerate actions remain where they are. They solve a different problem from stage-level restart and should not be folded into this change.

### Tighten Shot Script Project-Detail Eligibility

The project detail page currently allows shot-script generation when the project is already in `shot_script_in_review` or `shot_script_approved`. Under the new rule, the stage-level top button should only be enabled when the previous stage has been approved, meaning `storyboard_approved`.

This aligns shot-script stage behavior with the user's explicit rule and keeps all top-level stage buttons consistent.

## Affected Files

Primary UI files:

- `apps/studio/src/pages/project-detail-page.tsx`
- `apps/studio/src/components/master-plot-phase-panel.tsx`
- `apps/studio/src/components/character-sheets-phase-panel.tsx`
- `apps/studio/src/components/storyboard-phase-panel.tsx`
- `apps/studio/src/components/shot-script-phase-panel.tsx`
- `apps/studio/src/components/image-phase-panel.tsx`
- `apps/studio/src/pages/master-plot-review-page.tsx`
- `apps/studio/src/pages/review-workspace-page.tsx`
- `apps/studio/src/pages/shot-script-review-page.tsx`

Supporting client surface:

- `apps/studio/src/services/api-client.ts`
  - expected to already contain all required methods

Primary tests:

- `apps/studio/tests/integration/project-detail-page.test.tsx`
- `apps/studio/tests/integration/project-review-page.test.tsx`
- `apps/studio/tests/integration/review-actions.test.tsx`

Potentially relevant API and core tests should only change if a UI decision exposes an assumption mismatch, but the design does not require backend changes.

## Error Handling

- If task creation/regeneration fails on project detail:
  - remain on the current panel
  - show the existing task or page error path
- If task creation/regeneration fails on a review page:
  - do not navigate away
  - surface the failure with the page's existing error handling style
- If a button is disabled because prerequisites are not approved:
  - do not introduce a new tooltip or hint in this change unless already implied by existing panel copy

## Testing Strategy

### Project Detail Integration Coverage

- Verify all stage-top buttons render `重新生成`
- Verify buttons are disabled until the previous stage is approved
- Verify enabled buttons call the correct API method
- Verify shot-script top button is no longer enabled from `shot_script_in_review` / `shot_script_approved`

### Review Page Integration Coverage

- Verify master plot review shows top-level `重新生成`
- Verify storyboard review shows top-level `重新生成`
- Verify shot script review shows top-level `重新生成`
- Verify regenerate actions navigate back to `/projects/:projectId` on success
- Verify regenerate actions are disabled while there are unsaved edits

### Regression Coverage

- Keep existing approval and save flows intact
- Keep item-level regenerate controls intact
- Keep project polling behavior unchanged after task creation

## Risks

- The current review pages use browser `alert`, `confirm`, and `prompt` flows; adding another top-level action must avoid creating ambiguous action ordering in the header.
- The master plot regenerate flow currently requires a reject reason because it reuses `rejectMasterPlot`; the UI needs a clear but minimal confirmation/input path.
- Tightening shot-script project-detail eligibility may require updating existing tests that assumed regenerate from later shot-script statuses.

## Recommended Implementation Order

1. Update the project detail page eligibility logic and button labels.
2. Add review-page top-level regenerate actions.
3. Adjust integration tests for detail and review pages.
4. Run studio integration coverage for the touched areas.
