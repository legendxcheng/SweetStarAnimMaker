# Seedance Short Drama Guide Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an operator-facing Seedance 2.0 guide for short-drama video generation, focused on 15-second-or-shorter multi-shot segments that must stay continuous with adjacent clips.

**Architecture:** Add one focused Markdown guide under `docs/guide`, grounded in current official Seedance 2.0 docs and organized by real operator workflow rather than by product feature. Keep templates, continuity checklists, and revision recipes as the main deliverables, with supporting process docs saved under `docs/superpowers`.

**Tech Stack:** Markdown, local repository docs, current official Seedance 2.0 web documentation

---

## Chunk 1: Lock Source Constraints And Outline

### Task 1: Confirm official Seedance constraints that affect operator decisions

**Files:**
- Modify: `docs/guide/Seedance-ShortDrama-Video-Guide.md`
- Reference: `docs/superpowers/specs/2026-04-17-seedance-shortdrama-guide-design.md`

- [ ] **Step 1: Re-read the approved design**

Run:

```powershell
Get-Content -Path 'E:\SweetStarAnimMaker\docs\superpowers\specs\2026-04-17-seedance-shortdrama-guide-design.md'
```

Expected: the design clearly states operator-first structure, continuity emphasis, and template-first writing.

- [ ] **Step 2: Re-check the official source notes gathered for Seedance 2.0**

Run:

```powershell
Get-Content -Path 'E:\SweetStarAnimMaker\seedance_prompt_guide.md'
```

Expected: locally captured official prompting notes are available for prompt structure and reference-image behavior.

- [ ] **Step 3: Confirm the guide outline before drafting**

Write the outline directly into `docs/guide/Seedance-ShortDrama-Video-Guide.md` with placeholder headings that match the approved workflow order.

- [ ] **Step 4: Verify the outline is operator-first**

Run:

```powershell
Get-Content -Path 'E:\SweetStarAnimMaker\docs\guide\Seedance-ShortDrama-Video-Guide.md'
```

Expected: headings lead the reader from "is this segment suitable?" through prompting, continuity, references, templates, and repair.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-seedance-shortdrama-guide-design.md docs/superpowers/plans/2026-04-17-seedance-shortdrama-guide.md docs/guide/Seedance-ShortDrama-Video-Guide.md
git commit -m "docs: scaffold Seedance short drama guide"
```

## Chunk 2: Draft The Practical Guide

### Task 2: Write the core operator workflow sections

**Files:**
- Modify: `docs/guide/Seedance-ShortDrama-Video-Guide.md`
- Reference: `docs/guide/VectorEngine-Kling-Video-Guide.md`

- [ ] **Step 1: Write the opening sections**

Add:

- purpose
- target scenario
- official-scope note
- quick decision rule for when one-pass generation is appropriate

- [ ] **Step 2: Write the continuity-first prompt framework**

Add:

- one master prompt template
- explanation of each prompt block
- instructions for inherited opening state and ending handoff state

- [ ] **Step 3: Write the multi-sub-shot time-axis section**

Add:

- recommended 2-5 sub-shot pattern
- how to express time windows
- what to keep continuous between windows
- what not to over-specify

- [ ] **Step 4: Write the adjacent-clip continuity section**

Add:

- previous clip carry-over checklist
- current clip no-change constraints
- ending state for next clip
- first-frame / last-frame strategy for chaining

- [ ] **Step 5: Verify the drafted sections read like a field manual**

Run:

```powershell
Get-Content -Path 'E:\SweetStarAnimMaker\docs\guide\Seedance-ShortDrama-Video-Guide.md'
```

Expected: sections are directive, copyable, and centered on operator decisions rather than theory.

- [ ] **Step 6: Commit**

```bash
git add docs/guide/Seedance-ShortDrama-Video-Guide.md
git commit -m "docs: draft Seedance short drama workflow guide"
```

## Chunk 3: Add Templates, Failure Repairs, And Verification

### Task 3: Finish the guide with reusable templates and troubleshooting

**Files:**
- Modify: `docs/guide/Seedance-ShortDrama-Video-Guide.md`

- [ ] **Step 1: Add reusable short-drama segment templates**

Include at minimum:

- dialogue progression beat
- emotional reaction beat
- reveal/response beat
- movement transition beat

- [ ] **Step 2: Add failure-to-fix mappings**

Cover at minimum:

- character drift
- emotional discontinuity
- sub-shot fragmentation
- mismatch with previous clip
- mismatch with next clip
- camera over-performance

- [ ] **Step 3: Add a concise official reference section**

List the official Seedance 2.0 docs used and indicate the checked dates in prose.

- [ ] **Step 4: Verify headings, code fences, and link text**

Run:

```powershell
Get-Content -Path 'E:\SweetStarAnimMaker\docs\guide\Seedance-ShortDrama-Video-Guide.md'
```

Expected: markdown is clean, examples are readable, and no section is left as a placeholder.

- [ ] **Step 5: Check git diff for documentation-only changes**

Run:

```powershell
git diff -- docs/superpowers/specs/2026-04-17-seedance-shortdrama-guide-design.md docs/superpowers/plans/2026-04-17-seedance-shortdrama-guide.md docs/guide/Seedance-ShortDrama-Video-Guide.md
```

Expected: only the three documentation files created for this task appear in the diff.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-17-seedance-shortdrama-guide-design.md docs/superpowers/plans/2026-04-17-seedance-shortdrama-guide.md docs/guide/Seedance-ShortDrama-Video-Guide.md
git commit -m "docs: add Seedance short drama guide"
```

Plan complete and saved to `docs/superpowers/plans/2026-04-17-seedance-shortdrama-guide.md`. Ready to execute?
