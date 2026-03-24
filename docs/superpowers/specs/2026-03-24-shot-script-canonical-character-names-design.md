# Shot Script Canonical Character Names Design

## Goal

Prevent shot script generation from losing canonical character identity before the image-planning phase by enforcing standard approved character names during shot script generation.

## Problem

The current shot script segment flow treats `subject`, `visual`, and `action` as free-form review text. That allows the model to drift from approved character-sheet names such as `职员K` to shorthand or generic references such as `K`, `男子`, or `领头特工`.

Once that drift happens, frame prompt generation has to infer which approved character sheet matches the shot script text. In the failing project, the image planner returned `selectedCharacterIds: []` even though the project already had approved character images for `职员K` and `黑衣特工`.

## Scope

Included:
- Tighten the `shot_script.segment.generate` prompt so approved character sheets are explicit input constraints
- Validate generated shot script output against canonical approved character names
- Retry provider generation when canonical-name validation fails
- Reuse the same validation when a human edits and saves a shot script segment
- Add focused tests for prompt constraints, provider validation, and human-save validation

Excluded:
- New structured shot-level character ID fields
- Downstream image-planning fallback heuristics
- Automatic text rewriting of invalid shot content after generation
- Changes to storyboard generation or master-plot generation

## Design

### Canonical Name Contract

Approved character sheets become the single source of truth for reviewable character naming in shot scripts.

For any approved character sheet used as input to shot script generation:
- The canonical review name is `characterName`
- The model must use that exact canonical name when the character is present in a shot
- Unregistered shorthand and generic substitutes are not allowed for named approved characters

Examples:
- Allowed: `职员K`
- Rejected: `K`, `男子`, `年轻男人`
- Allowed: `黑衣特工`
- Rejected: `领头特工`, `三名特工` when the shot clearly refers to the approved character identity rather than an unnamed crowd role

The enforcement target is not every noun in the sentence. The target is identity continuity for approved named characters.

### Prompt Template Changes

The segment prompt template should render an explicit approved-character section built from `characterSheets`.

That section should list, for each approved character sheet:
- Canonical character name
- Current appearance prompt text
- A hard instruction that any shot involving that character must use the canonical character name in `subject`, and should preserve the same name in `visual` and `action`

The template should also add explicit prohibitions:
- Do not shorten approved character names
- Do not replace approved character names with generic labels such as `男人`, `女人`, `男特工`, `主角`
- If a shot contains no approved named character, generic environmental subjects remain allowed

This keeps the constraint in the shot-script generation stage instead of deferring the problem to image planning.

### Provider Validation

`gemini-shot-script-provider` should validate the generated segment after the existing JSON, Chinese-text, and duration checks.

Validation behavior:
- Read approved character context from `variables.characterSheets`
- Build a canonical-name validator from that list
- Check every shot review field, focusing on `subject` first and then `visual` and `action`

Validation rules:
- If a shot references an approved named character, `subject` must contain the canonical name
- If `subject` contains an unapproved shorthand or alias for an approved named character, reject
- If `subject` is canonical but `visual` or `action` clearly replace that same character with a generic substitute, reject
- If a shot contains only environment, props, or unnamed crowd action, pass

The validator should stay rule-based and small. It does not need deep NLP. It only needs to catch the common identity-loss cases that break downstream reference matching.

### Retry Strategy

If canonical-name validation fails, the provider should re-prompt the model with a compact correction message that includes the specific violations.

Example violations:
- `shot 1 subject 使用了未登记简称“K”，必须改为“职员K”`
- `shot 1 action 描写了已批准角色，但未保留标准角色名“职员K”`

Retry policy:
- Initial generation attempt
- Up to 2 correction retries
- If all attempts fail, surface a clear provider error and do not persist invalid shot script output

This avoids silently mutating review text in code while still keeping the correction loop inside shot script generation.

### Human Save Validation

Human-edited shot script segments should reuse the same canonical-name validator in `save-human-shot-script-segment`.

That keeps the contract consistent across both entry points:
- LLM-generated segments
- Human-edited segments

If a reviewer manually changes `职员K` back to `K`, the save should fail with the same category of validation error instead of allowing broken review data back into the pipeline.

### Shared Validator Module

The canonical-name rules should live in one reusable core helper so the provider path and human-save path cannot diverge.

Responsibilities of the helper:
- Extract approved canonical names from character-sheet context
- Validate shot review fields
- Return a structured list of violations for retry prompts and human-facing errors

This should stay as a small focused utility rather than spreading ad hoc string checks across multiple use cases.

## Error Handling

Provider path:
- Validation failure triggers correction retry
- Exhausted retries throw a shot-script validation error with actionable detail

Human save path:
- Validation failure rejects the save immediately
- Error text should name the shot and the invalid alias or missing canonical name

No invalid segment should be written to current shot script storage.

## Testing Strategy

Provider tests:
- Accept canonical approved names
- Reject shorthand aliases such as `K`
- Reject generic replacement labels when an approved named character is clearly referenced
- Retry on validation failure and succeed on corrected second response
- Fail after retry budget is exhausted

Core or use-case tests:
- Human save rejects invalid canonical-name drift
- Human save accepts canonical approved names

Template coverage:
- Prompt template includes approved character guidance

## Risks

- Some projects may intentionally use role labels instead of personal names. This design intentionally prioritizes approved character-sheet continuity over stylistic flexibility because the downstream image system depends on stable identity references.
- Rule-based validation may reject borderline wording. That is acceptable for now because the goal is to stop identity loss early, not to maximize prose variety.
- Retry loops add provider calls. The retry budget is capped to keep cost and latency bounded.
