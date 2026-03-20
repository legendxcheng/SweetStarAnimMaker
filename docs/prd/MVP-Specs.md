# MVP Spec Roadmap

## Purpose

This document records the five validated MVP specs for SweetStarAnimMaker.

The goal is to keep the MVP split into small, verifiable deliveries instead of a single oversized spec. Each spec should end in a state that can be tested and used as the baseline for preparing the next one.

## Scope Principles

- Each spec must produce a verifiable increment.
- Each spec should introduce one primary layer of capability.
- Later specs may depend on earlier specs, but should not redefine them.
- The MVP target remains: `script -> storyboard generation -> human review`, using a real AI provider, local files for assets, and SQLite for indexes and state.

## Spec 1: Local Project And Asset Foundation

### Goal

Establish the local project model and persistent storage baseline.

### Includes

- project creation
- project metadata persistence
- SQLite index storage for projects
- local file storage for script content
- stable per-project directory layout
- project detail query API

### Excludes

- async task queue
- worker process
- AI provider integration
- storyboard generation
- review workflow

### Verification

- A project can be created successfully.
- SQLite contains the expected project record.
- The project directory is created under local storage.
- The original script is written to disk.
- The API can return the project summary and script metadata.

### Why It Exists

This spec locks down the storage contract that all later specs depend on.

## Spec 2: Pipeline Task Skeleton

### Goal

Establish the asynchronous pipeline backbone for storyboard generation tasks.

### Includes

- task persistence model
- `StoryboardGenerate` task type
- Redis-backed queue integration
- worker process setup
- task lifecycle transitions
- task input, output, and log file layout
- API for creating and querying tasks

### Excludes

- real LLM calls
- storyboard parsing
- review actions

### Verification

- A storyboard generation task can be created from the API.
- The worker can consume the queued task.
- Task status transitions through `pending -> running -> succeeded` or `failed`.
- Task files such as `input.json`, `output.json`, and `log.txt` are written.

### Why It Exists

This spec verifies the execution model before real provider integration adds more variables.

## Spec 3: Real LLM Storyboard Generation

### Goal

Use a real LLM provider to generate structured storyboard output from the stored script.

### Includes

- one real LLM provider adapter
- prompt construction for storyboard generation
- raw provider response persistence
- structured storyboard parsing
- storyboard version persistence
- current storyboard version pointer management

### Excludes

- manual editing
- approval and rejection workflow
- full studio UI

### Verification

- A storyboard generation task calls the real provider successfully.
- The system writes a structured storyboard file such as `v1-ai.json`.
- SQLite stores the storyboard version index.
- The current storyboard version can be queried from the project API.

### Why It Exists

This spec validates the highest-risk technical dependency in the first business flow.

## Spec 4: Storyboard Review And Manual Editing

### Goal

Introduce the human review loop for generated storyboard results.

### Includes

- loading the current storyboard version
- manual scene editing
- saving edited storyboard content as a human version
- approve action
- reject action
- regenerate action
- review record persistence
- project state transitions for review outcomes

### Excludes

- image generation
- video generation
- final merge/export

### Verification

- A generated storyboard can be loaded for review.
- Edited storyboard content is saved as a new human version.
- The current version pointer updates correctly.
- Approve and reject actions are persisted correctly.
- Reject can trigger a new storyboard generation task.

### Why It Exists

This spec completes the core Human-in-the-loop workflow defined in the PRD.

## Spec 5: Studio Minimum Usable Workbench

### Goal

Provide a browser-based working UI that lets a user complete the first real storyboard pipeline without manual API usage.

### Includes

- project creation page
- project detail page
- task status display
- current storyboard display
- review and edit page
- approve, reject, and regenerate controls
- basic loading, empty, and error states

### Excludes

- image workflow
- video workflow
- desktop packaging
- multi-user support
- advanced administration

### Verification

- A user can create a project from the browser.
- A user can submit a storyboard generation task.
- The UI reflects task progress and results.
- The user can review, edit, approve, reject, and regenerate from the UI.
- The first real MVP flow works without direct command-line or manual database interaction.

### Why It Exists

This spec turns the earlier backend capabilities into a real operator-facing workflow.

## Dependency Order

The recommended implementation sequence is:

1. Spec 1
2. Spec 2
3. Spec 3
4. Spec 4
5. Spec 5

This order keeps the risk curve controlled:

- Spec 1 validates storage rules.
- Spec 2 validates task orchestration.
- Spec 3 validates the real provider path.
- Spec 4 validates human review behavior.
- Spec 5 validates end-to-end usability.

## Handoff Guidance

After each spec is completed:

1. verify the spec acceptance points with real evidence
2. record any architecture changes that affect later specs
3. write the next spec as a focused implementation-ready document
4. avoid pulling future-spec concerns into the current implementation unless they remove immediate rework

The next document to prepare is `Spec 1`, using this roadmap as the top-level MVP reference.
