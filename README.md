# SweetStarAnimMaker

Initial workspace scaffold for the manga-drama production tool described in `docs/prd/Overall.md`.

Current scope:

- browser-first React application in `apps/studio`
- shared business and service packages in `packages/*`
- shared tooling and documentation directories for later implementation work

This commit establishes only the repository structure. React, Tauri, and runtime tooling are intentionally not initialized yet.

## Windows Quick Start

If the repository is already present on a Windows machine and that machine does not have Node.js installed yet:

1. Right-click `install-windows.bat` and run it.
2. Allow the administrator prompt.
3. Wait for the script to install Node.js LTS, enable Corepack, activate `pnpm@10.6.5`, install workspace dependencies, and create a default `.env` if one does not exist yet.
4. Double-click `run-sweetstar.bat`.

What the installer does:

- installs official Windows x64 Node.js LTS if the machine is missing Node.js or the installed major version is older than the repository baseline
- enables Corepack and activates the repository `pnpm` version
- runs `corepack pnpm install`
- creates a local-safe `.env` without a `VECTORENGINE_API_TOKEN`

The generated `.env` is intentionally smoke-mode safe. If you want real generation instead of smoke mode, add your own `VECTORENGINE_API_TOKEN` to `.env` after installation.

## Windows Tauri Desktop Package

The short-term desktop package is Windows-only. It embeds the built Studio UI in a Tauri shell and packages the existing Node backend stack as a local runtime resource.

Build the desktop installer:

```bash
corepack pnpm install
corepack pnpm desktop:build
```

The build runs `desktop:prepare`, which builds `apps/studio`, prepares `desktop-runtime`, copies the current Windows `node.exe`, and bundles the existing backend source/runtime dependencies for the Tauri installer. The packaged app starts the local backend on `127.0.0.1:13000` when the desktop window opens and stops it when the window closes.

This first desktop package intentionally reuses the current `.env` and `.local-data` behavior inside the packaged backend runtime. It is a short-term distribution path, not the final workspace-selection design.

## Backend API And Worker

Install dependencies:

```bash
corepack pnpm install
```

Start the local API:

```bash
corepack pnpm --filter @sweet-star/api dev
```

Start the Spec2 worker:

```bash
corepack pnpm --filter @sweet-star/worker dev
```

Start the Studio browser app:

```bash
corepack pnpm --filter @sweet-star/studio dev
```

Or use the shorthand:

```bash
corepack pnpm dev:studio
```

The Studio app will be available at `http://localhost:5173`.

Studio and API local browser config:

```bash
set VITE_API_BASE_URL=http://localhost:13000
set STUDIO_ORIGIN=http://localhost:5173
```

On macOS/Linux:

```bash
export VITE_API_BASE_URL=http://localhost:13000
export STUDIO_ORIGIN=http://localhost:5173
```

`VITE_API_BASE_URL` controls which API the Studio browser app calls. `STUDIO_ORIGIN` controls which browser origin the API allows through CORS. If Vite starts on a different port, update `STUDIO_ORIGIN` to match.

Storyboard generation runtime configuration:

```bash
set REDIS_URL=redis://127.0.0.1:6379
set VECTORENGINE_API_TOKEN=your-token
set VECTORENGINE_BASE_URL=https://api.vectorengine.ai
set STORYBOARD_LLM_MODEL=gemini-3.1-pro-preview
```

On macOS/Linux:

```bash
export REDIS_URL=redis://127.0.0.1:6379
export VECTORENGINE_API_TOKEN=your-token
export VECTORENGINE_BASE_URL=https://api.vectorengine.ai
export STORYBOARD_LLM_MODEL=gemini-3.1-pro-preview
```

`VECTORENGINE_API_TOKEN` is required for the real Spec3 worker flow. `VECTORENGINE_BASE_URL` is optional and defaults to `https://api.vectorengine.ai`. `STORYBOARD_LLM_MODEL` is optional and defaults to `gemini-3.1-pro-preview`.

Project storyboard workflow statuses:

- `script_ready`: project has a saved script and no storyboard generation in progress
- `storyboard_generating`: a `storyboard_generate` task is queued or running
- `storyboard_in_review`: the current storyboard is ready for manual review or editing
- `storyboard_approved`: the current storyboard has been approved

Storyboard review API endpoints:

- `GET /projects/:projectId/storyboard/current`: returns the current storyboard document
- `GET /projects/:projectId/storyboard/review`: returns the review workspace payload
- `POST /projects/:projectId/storyboard/save-human-version`: saves a whole-document manual edit as the next `human` version
- `POST /projects/:projectId/storyboard/approve`: approves the current storyboard version
- `POST /projects/:projectId/storyboard/reject`: rejects the current storyboard version with a required reason and `nextAction`

Review actions:

- `approve`: writes a review record and moves the project to `storyboard_approved`
- `reject` with `nextAction = "regenerate"`: writes a reject review record, creates a new `storyboard_generate` task, and moves the project back to `storyboard_generating`
- `reject` with `nextAction = "edit_manually"`: writes a reject review record and keeps the project in `storyboard_in_review`
- `save-human-version`: writes a new `vN-human.json` storyboard file and promotes it to the current version without auto-approving it

Run tests:

```bash
corepack pnpm test
```

Run type checks:

```bash
corepack pnpm typecheck
```

Local verification commands:

```bash
corepack pnpm --filter @sweet-star/api test
corepack pnpm --filter @sweet-star/worker test
```

Local SQLite data and project files are written under `.local-data/`, including:

- project scripts under `.local-data/projects/<project>/script/`
- task artifacts under `.local-data/projects/<project>/tasks/<task>/`
- raw storyboard provider responses under `.local-data/projects/<project>/storyboards/raw/`
- structured storyboard versions under `.local-data/projects/<project>/storyboards/versions/`

Human review saves create files like `.local-data/projects/<project>/storyboards/versions/v2-human.json`.

Windows development should use Docker Redis or Memurai for local Redis.

## Studio Browser App

The Studio app provides a browser-based UI for the complete storyboard workflow:

1. **Projects List** (`/`): View all projects and create new ones
2. **Project Detail** (`/projects/:id`): View project status, current storyboard, and task progress
3. **Review Workspace** (`/projects/:id/review`): Review, edit, approve, or reject storyboards

### Complete MVP Flow

1. Start the API server: `corepack pnpm --filter @sweet-star/api dev`
2. Start the worker: `corepack pnpm --filter @sweet-star/worker dev`
3. Start the Studio app: `corepack pnpm dev:studio`
4. Open `http://localhost:5173` in your browser
5. Create a new project with a script
6. Click "Generate Storyboard" on the project detail page
7. Wait for task polling to reach a terminal state and expose "Enter Review"
8. Edit summary or scenes, then click "Save Changes" to create a human storyboard version
9. Approve the storyboard, reject for manual editing, or reject with regeneration to return to project detail and track the next task

The Studio app communicates with the API at `http://localhost:13000` (configurable via `VITE_API_BASE_URL`).
