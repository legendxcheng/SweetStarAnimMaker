# Character Subject Upload Design

## Goal

Add a character-subject upload workflow to the Studio character sheets panel so reviewers can upload one character or all characters as Kling Omni custom elements, persist those uploaded element records on the character sheet itself, and automatically reuse the stored `elementId` values during later video generation.

## Scope

This design adds:

- per-character subject upload from the character sheets panel
- batch upload for all current characters in the active character-sheet batch
- persisted subject-upload metadata on `CharacterSheetRecord`
- API routes and use cases for single and batch subject upload
- automatic `elementId` injection into segment video generation when uploaded subjects match a shot's selected characters

This design does not add:

- video-reference subject upload
- manual subject selection in the video UI
- background async polling infrastructure beyond the request-scoped upload flow
- multiple saved subject versions per character

## Current State

`apps/studio/src/components/character-sheets-phase-panel.tsx` already lets reviewers inspect a generated character image, edit prompt text, upload reference images, regenerate, and approve a character. The character APIs return `CharacterSheetRecord` items with prompt, reference images, generated image metadata, and review state.

The repository also already contains a verified Kling Omni provider that supports:

- `createElement()`
- `getElement()`
- `submitOmniVideoWithElements()`

However, there is currently no persistent place to store uploaded subject state per character, no UI action to trigger subject upload, and no video-generation logic that reuses uploaded `elementId` values.

## Design

### Persist subject-upload state on character sheets

Extend `CharacterSheetRecord` with a new nullable-or-defaulted `subjectUpload` object so subject state follows the existing character record lifecycle and remains keyed by the existing character id.

Suggested shape:

- `status`: `not_uploaded | uploading | uploaded | failed`
- `provider`: `string | null`
- `elementId`: `string | null`
- `elementTaskId`: `string | null`
- `elementName`: `string | null`
- `lastUploadedAt`: `string | null`
- `lastError`: `string | null`

Default state for existing and new character sheets:

- `status = "not_uploaded"`
- all other fields `null`

This keeps the mapping from shot-selected character ids to uploaded subject ids trivial and avoids adding a second table or join layer.

### Upload rules

Single upload uses only the current generated character image:

- source image is `character.imageAssetPath`
- `createElement()` uses `character.characterName` as `name`
- `createElement()` uses a short deterministic description based on `character.characterName`
- `frontalImage` uses the current generated image path
- `referenceImages` also uses that same current generated image path as the single required reference entry

This matches the confirmed requirement that upload should use only the current character image asset, while satisfying the Kling Omni provider's current requirement that `referenceImages` must contain at least one image.

### API surface

Add two new character-sheet routes:

- `POST /projects/:projectId/character-sheets/:characterId/subject-upload`
- `POST /projects/:projectId/character-sheets/subject-upload`

Single-upload response returns the updated `CharacterSheetRecord`.

Batch-upload response returns a dedicated summary payload with:

- `characters`: updated per-character records or result summaries
- counts for attempted, succeeded, and failed uploads

Batch upload runs sequentially on the server. This is intentional:

- avoids rate spikes against VectorEngine
- keeps logs and failure reporting predictable
- makes retries easier to reason about

### Use-case behavior

Add a dedicated use case for single upload and a thin batch wrapper use case.

Single upload flow:

1. Load project and character
2. Validate the character has a current `imageAssetPath`
3. Update `subjectUpload.status` to `uploading` and clear prior error
4. Resolve the project-relative image path to an absolute local path
5. Call Kling Omni `createElement()`
6. Poll Kling Omni `getElement()` using the returned task id until:
   - `elementId` is present, or
   - the task fails, or
   - the poll limit is reached
7. Persist the final state on the character record

Success writes:

- `status = "uploaded"`
- `provider = "kling-omni"`
- `elementId`
- `elementTaskId`
- `elementName`
- `lastUploadedAt`
- `lastError = null`

Failure writes:

- `status = "failed"`
- `provider = "kling-omni"` when available
- `elementTaskId` if creation started
- `lastError`

Batch upload flow:

- find the current batch from project detail
- iterate current characters in order
- call the single-upload use case per character
- collect per-character success or failure results without aborting the batch on the first failure

### Studio UI changes

Update `CharacterSheetsPhasePanel` in two places.

List column:

- add a top-level `批量上传全部主体` button
- show each character's subject-upload state inline in the list item

Detail pane:

- add a `上传当前角色主体` button near the image preview and review actions
- show the stored `elementId` after upload
- show upload failure text when `subjectUpload.status === "failed"`
- disable upload if:
  - there is no `imageAssetPath`, or
  - another subject-upload action is in progress

The UI should treat subject upload as independent from prompt save, regenerate, approve, and reference-image actions.

### Video-generation integration

Do not add any new user-facing control in the video stage. Reuse stored subject data automatically.

When creating segment video task inputs:

- inspect the shot reference's `selectedCharacterIds`
- load the matching character-sheet records
- collect unique `subjectUpload.elementId` values for characters whose subject-upload status is `uploaded`

Then:

- if the resulting `elementIds` array is non-empty, include it in `SegmentVideoGenerateTaskInput`
- in `process-segment-video-generate-task`, call `videoProvider.generateSegmentVideo()` with those `elementIds`
- the Kling Omni-backed provider path should prefer subject-element submission when `elementIds` are present
- if `elementIds` are absent, keep the existing start-frame or start/end-frame behavior unchanged

This preserves current behavior for projects that have no uploaded subjects while making subject reuse automatic for projects that do.

### Error handling

Single upload:

- missing current image: fail fast with a readable validation error
- provider creation failure: persist `failed` with `lastError`
- provider task never yields an `elementId`: persist `failed` with task id retained for debugging

Batch upload:

- one character failure does not abort the batch
- return aggregate counts and per-character errors

Video generation:

- missing upload for some selected characters is not an error
- only successfully uploaded characters contribute `elementIds`

## Testing

Follow TDD across the affected layers.

Shared/schema tests:

- `subjectUpload` parsing and defaults
- batch-upload response schema parsing

Core tests:

- single subject upload success
- single subject upload failure when character image is missing
- single subject upload provider failure and poll timeout handling
- batch upload continues after one character fails
- video task input includes uploaded `elementIds` for matching selected characters

Services tests:

- sqlite character-sheet repository reads and writes `subjectUpload`
- video provider chooses Omni element submission when `elementIds` are supplied

API tests:

- single subject-upload route
- batch subject-upload route

Studio integration tests:

- single upload button calls the new API and renders uploaded status
- batch upload button triggers uploads for all characters and renders summary/state
- failed upload renders error state without breaking other controls

## Result

After this change, the character sheets workspace will support one-click or batch subject upload, persist the resulting Kling Omni element records directly on each character, and automatically reuse those stored subjects when generating later videos for shots that reference the uploaded characters.
