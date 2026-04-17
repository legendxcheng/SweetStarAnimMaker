# Seedance Short Drama Guide Design

## Goal

Create an operator-facing practical guide for Seedance 2.0 short-drama video generation, focused on one recurring production need:

- generate one 15-second or shorter dramatic segment in one request
- allow that segment to contain multiple sub-shots
- keep the segment usable as one middle piece inside a longer edited sequence
- help operators preserve continuity with the previous and next video segments

The output is not a product spec or API reference. It is a field manual that operators can copy from while writing prompts under production pressure.

## User Problem

The target user is not asking "what features does Seedance support?".

They are asking:

- I have a short-drama beat that belongs inside a longer scene.
- I want Seedance to generate the whole 15-second beat in one pass if possible.
- That beat may contain 2 to 5 internal sub-shots.
- The generated clip must still match the previous and next clips in character, costume, setting, emotional state, and camera handoff.

Existing vendor documentation explains prompting and reference inputs, but it does not package the guidance around this exact short-drama production workflow. The missing piece is a practical operating method for continuity-first multi-shot prompt writing.

## Target Reader

This guide is written for the operator who is actively preparing or revising video prompts.

Assumptions:

- the reader already knows the basic concept of image-to-video generation
- the reader needs copyable prompt structures more than theory
- the reader cares more about "how do I get this clip through production?" than about model marketing language

The guide should therefore optimize for fast lookup, reusable templates, and explicit correction patterns.

## Scope

The guide should focus on:

1. when a short-drama segment is suitable for one-pass generation
2. how to structure one prompt for a 15-second or shorter segment
3. how to express multiple sub-shots as one continuous time-axis
4. how to preserve continuity with previous and next clips
5. how to combine reference images, first/last frame modes, and continuity intent
6. how to repair common failures without rewriting the whole prompt from scratch

The guide may mention official Seedance 2.0 API and prompting constraints when they affect operator choices, such as:

- reference image numbering and explicit pointing
- first-frame vs first-and-last-frame vs multimodal reference mode boundaries
- duration limits
- adaptive ratio and cropping behavior
- return-last-frame for chaining clips

## Out of Scope

The guide should not become:

- a complete Seedance feature catalog
- a general video-AI industry comparison
- a developer integration tutorial for calling the API
- a broad filmmaking theory document

Technical/API facts should appear only when they directly support the operator's shot-building decisions.

## Recommended Structure

The guide should be organized by operator workflow, not by product feature list.

Recommended sections:

1. purpose and applicable scenarios
2. when a 15-second dramatic segment is suitable for one-pass generation
3. the prompt structure for a controllable short-drama segment
4. how to write multiple sub-shots in one prompt
5. how to preserve continuity with previous and next clips
6. how to choose reference images and first/last frame inputs
7. reusable short-drama segment templates
8. common failures and how to revise only the affected prompt block

## Core Writing Decisions

### Templates First

Each major section should begin with a reusable template or checklist.

Explanation should be concise and secondary. The reader should be able to copy a block, replace values, and use it immediately.

### Short-Drama Framing

All advice should be framed around dramatic segments such as:

- dialogue progression
- emotional reaction
- reveal and response
- movement into or out of a space
- confrontation beats
- transition beats between adjacent segments

Do not write from a generic advertising or demo-video perspective.

### Continuity As a Separate System

Continuity is the central difficulty and should be treated as a dedicated operating layer, not as a passing note.

The guide should explicitly teach operators to preserve:

- character appearance continuity
- costume and prop continuity
- emotional continuity
- action start-state continuity
- action end-state continuity
- scene geography continuity
- camera entry-point and landing-point continuity
- narrative function continuity

### Localized Revision

Failure handling should be localized.

For each common failure, the guide should answer:

- what went wrong
- which prompt block is responsible
- what to tighten or remove first

Avoid vague advice such as "try more times" or "add more detail".

## Prompt Philosophy

The guide should push operators toward a continuity-first prompt shape:

1. clip role inside the longer sequence
2. inherited opening state
3. immutable continuity constraints
4. time-axis sub-shot progression
5. ending handoff state
6. limited style/camera control

This should counter the common failure where users dump disconnected shot ideas into one prompt and expect the model to assemble a coherent dramatic beat.

## Source Requirements

The guide should ground operator advice in the current official Seedance 2.0 documentation wherever possible.

It should specifically reflect the official documents available on 2026-04-17, including:

- Seedance 2.0 prompting guidance
- Seedance 2.0 video generation API reference

Any non-official operating recommendations should be clearly framed as practical inference from the official model behavior, not as direct vendor claims.

## Files To Produce

- `docs/guide/Seedance-ShortDrama-Video-Guide.md`

Supporting process docs:

- `docs/superpowers/specs/2026-04-17-seedance-shortdrama-guide-design.md`
- `docs/superpowers/plans/2026-04-17-seedance-shortdrama-guide.md`

## Verification

The finished guide should be easy to scan and immediately usable.

Minimum verification:

- section order follows operator workflow
- templates are copyable and specific
- continuity guidance is more detailed than generic consistency advice
- all official claims map back to the current official docs
- markdown headings and code blocks render cleanly
