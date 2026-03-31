# Shot Script Segment Continuity Design

## Goal

Improve newly generated `shot_script` segments so they read and play as one continuous dramatic chain instead of isolated mini-scenes.

The priority order is:

1. strengthen continuity between adjacent storyboard segments inside the same scene
2. make each segment clearly advance one observable event
3. keep the current stored `shot_script` shape unchanged for downstream consumers

## Problem

The current `shot_script.segment.generate` flow gives Gemini almost only the current storyboard segment.

That is enough to produce locally plausible shots, but not enough to produce scene-level continuity. In practice this causes two failures:

1. Adjacent segments feel disconnected.
   - a segment often restarts visual setup instead of inheriting the previous segment's established state
   - the last shot of one segment often does not land on a state the next segment can directly continue from

2. Segment internals are narratively soft.
   - the model sometimes spends most of the duration on atmosphere, posture, or mood
   - the segment summary and shot purposes can remain descriptive without clearly stating what changed

This produces the user-visible result: the generated video feels strange and does not clearly tell the story.

## Desired Behavior

For each storyboard segment, the generated `shot_script` should behave like one node in a scene-level action chain.

Each generated segment should explicitly define:

- the inherited start state from the previous segment
- the single event-advance sentence this segment must accomplish
- the handoff end state that the next segment can continue from

Within the segment:

- the first shot should continue the already established space, character state, and action result whenever a previous segment exists
- the last shot should land on a visually and dramatically usable next state whenever a next segment exists
- the segment summary should describe state change, not only mood or description
- each shot purpose should serve the event chain, not decorative atmosphere

## Constraints

- Do not change persisted `CurrentShotScript`, `ShotScriptSegment`, or `ShotScriptItem` storage structure.
- Do not add migrations.
- Do not require UI changes to review or edit stored shot-script data.
- Keep the existing segment-first orchestration model.
- Keep old or partially written task payloads compatible where reasonable.

## Decision

Use the existing segment-first shot-script pipeline, but enrich each segment-generation task with adjacent-scene context and enforce a continuity-first prompt structure.

The implementation should:

1. add optional `previousSegment` and `nextSegment` context to `shot_script_segment_generate` task input
2. add scene-local position metadata such as current index and total segment count
3. optionally provide a previous shot-script handoff summary during regenerate flows when a matching current shot-script segment already exists
4. build a rendered `continuityGoal` sentence in the segment task processor
5. update the prompt template so Gemini must reason in this order:
   - inherited start state
   - event-advance sentence
   - handoff end state
   - then shot breakdown

This keeps the downstream asset contract stable while fixing the missing continuity context at generation time.

## Task Input Changes

### Segment Task Input

Extend `shot_script_segment_generate` task input with optional continuity fields:

```ts
type NeighborSegmentSnapshot = {
  id: string;
  order: number;
  durationSec: number | null;
  visual: string;
  characterAction: string;
  dialogue: string;
  voiceOver: string;
  audio: string;
  purpose: string;
};

type ShotScriptSegmentGenerateTaskInput = {
  // existing fields omitted
  previousSegment?: NeighborSegmentSnapshot | null;
  nextSegment?: NeighborSegmentSnapshot | null;
  sceneSegmentIndex?: number;
  sceneSegmentCount?: number;
  previousShotScriptSummary?: {
    summary: string;
    lastShotVisual: string | null;
    lastShotAction: string | null;
  } | null;
};
```

These fields are generation-time context only. They should not be persisted into the final `shot_script` asset.

### Orchestration Source

When `process-shot-script-generate-task` enqueues segment tasks, it should derive:

- `previousSegment` from the previous storyboard segment in the same scene
- `nextSegment` from the next storyboard segment in the same scene
- `sceneSegmentIndex` and `sceneSegmentCount` from scene order
- `previousShotScriptSummary` from the current shot script when a matching segment already exists and the flow is a regenerate/preserve scenario

For first-pass generation where previous shot-script data does not exist, `previousShotScriptSummary` should be `null`.

## Prompt Model Changes

### New Required Planning Layer

The prompt should require Gemini to identify three continuity objects before shot expansion:

1. `承接状态`
   - what state this segment is inheriting from the previous segment or scene setup
2. `事件推进句`
   - one observable sentence describing what changes in this segment
3. `交接状态`
   - the state the segment must land on so the next segment can directly continue

These do not need to become persisted fields in stored JSON. They can remain reasoning constraints that shape `summary`, `shots`, and `continuityNotes`.

### Prompt Hard Rules

Update `prompt-templates/shot_script.segment.generate.txt` so it explicitly tells Gemini:

- if `previousSegment` exists, do not restart scene setup; inherit its established space, character orientation, action result, and information state
- if `nextSegment` exists, end on a state that the next segment can directly pick up
- `summary` must follow a state-change sentence structure:
  - who did what under what situation, and what state did that lead to
- each `purpose` must describe dramatic advancement, not merely atmosphere or aesthetics
- if a candidate shot does not help establish inheritance, advance the event, or deliver the handoff, remove or compress it
- atmosphere is allowed only as support, never as the main purpose of the segment

### New Prompt Variables

Render these additional variables into the prompt:

- `previousSegment.id`
- `previousSegment.visual`
- `previousSegment.characterAction`
- `previousSegment.dialogue`
- `previousSegment.voiceOver`
- `previousSegment.audio`
- `previousSegment.purpose`
- `nextSegment.id`
- `nextSegment.visual`
- `nextSegment.characterAction`
- `nextSegment.dialogue`
- `nextSegment.voiceOver`
- `nextSegment.audio`
- `nextSegment.purpose`
- `sceneSegmentIndex`
- `sceneSegmentCount`
- `previousShotScriptSummary.summary`
- `previousShotScriptSummary.lastShotVisual`
- `previousShotScriptSummary.lastShotAction`
- `continuityGoal`

`continuityGoal` should be produced in code as a readable Chinese instruction sentence that makes the continuity requirement concrete.

Example:

```text
本段必须自然承接上一段已建立的雨夜市场入口对峙状态，推进“林夏确认出口已被堵死”这一事件，并在结尾落到“林夏准备转身找侧路”的可接续状态。
```

## Compatibility Strategy

Continuity additions should be backward compatible:

- new task input fields must be optional
- prompt rendering should fall back to empty strings or explicit `无上一段 / 无下一段` text when context is absent
- old tasks already serialized without the new fields should continue to process
- stored shot-script schema and review APIs remain unchanged

This means the change should improve new generations without breaking historical projects or queued jobs.

## Files In Scope

- `packages/core/src/domain/task.ts`
- `packages/core/src/use-cases/process-shot-script-generate-task.ts`
- `packages/core/src/use-cases/process-shot-script-segment-generate-task.ts`
- `prompt-templates/shot_script.segment.generate.txt`
- `packages/core/tests/process-shot-script-generate-task.segment-first.test.ts`
- `packages/core/tests/process-shot-script-segment-generate-task.test.ts`
- `packages/services/tests/default-shot-script-prompt-template.test.ts`

No storage schema, UI data model, or downstream frame/video contract changes are required in this iteration.

## Testing Strategy

### Core Orchestration Tests

Cover:

- segment task creation includes correct `previousSegment` and `nextSegment`
- scene index and segment count are correct for first, middle, and last segment cases
- regenerate or preserve flows can pass previous shot-script summary context when available

### Segment Prompt Rendering Tests

Cover:

- prompt snapshot includes adjacent segment context blocks
- prompt snapshot includes `continuityGoal`
- prompt snapshot keeps spoken-text budget rules intact after adding continuity context
- absence of adjacent context still renders a valid prompt

### Prompt Template Tests

Verify the template explicitly requires:

- inherited start state
- event-advance sentence
- handoff end state
- no scene restart when previous context exists
- no vague or atmosphere-only segment summary

## Non-Goals

- changing stored `shot_script` JSON structure
- redesigning the shot-script review UI
- adding a new scene-level planning asset or task type
- changing image prompt or video prompt schema in this iteration
- automatically rewriting old shot-script data

## Risks

1. Prompt length increases and may slightly reduce first-pass model consistency.
   Mitigation: keep new context limited to adjacent segments plus one generated continuity sentence.

2. Too much continuity pressure could overconstrain segments and reduce visual variety.
   Mitigation: require continuity of state and event logic, not identical shot composition.

3. Regenerate flows may use stale current shot-script summaries if selector matching is wrong.
   Mitigation: only derive previous shot-script summary from exact same-scene neighboring segment matches and keep it optional.

## Outcome

Newly generated shot-script segments should stop feeling like disconnected prompt fragments.

Instead, each segment should:

- inherit a clear start state
- advance one observable story event
- hand off a usable end state

That directly targets the current user complaint that the shot-script output feels incoherent and the resulting video fails to clearly tell the story.
