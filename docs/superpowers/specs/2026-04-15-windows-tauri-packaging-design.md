# Windows Tauri Packaging Design

**Goal**

Package the existing SweetStar Studio frontend, API, worker, and in-process Redis runtime into a Windows-only Tauri desktop installer that users can run without separately installing Node or Redis.

**Scope**

- Add a Windows-only Tauri desktop shell for `apps/studio`.
- Keep the current `studio -> api -> worker -> redis` architecture instead of collapsing services into Tauri commands.
- Build `apps/studio` as static frontend assets for the desktop app.
- Build `apps/api` and `apps/worker` to production JavaScript and launch them from a packaged Node runtime.
- Require users to choose a writable workspace directory on first launch.
- Read `.env` from that workspace directory instead of bundling `.env` inside the installer.
- Store SQLite, generated images and videos, task artifacts, logs, and runtime state under the selected workspace directory.
- Shut down the packaged backend stack when the desktop app exits.

**Non-Goals**

- No macOS or Linux packaging.
- No Redis removal or queue refactor away from BullMQ.
- No rewrite of API endpoints into Tauri commands.
- No desktop settings page for editing environment variables.
- No automatic updater, multi-workspace management, or migration tool.
- No elimination of loopback HTTP in the first release.

**User Constraints**

- Desktop packaging only needs to support Windows.
- Redis can remain part of the runtime.
- The first release only needs to get the packaged stack running end to end.
- Generated videos and other large data must not be written under Tauri `AppData`.
- `.env` must stay outside the installer payload and will be distributed separately.
- The desktop app may require first-run workspace selection.

**Current Repository Shape**

- `apps/studio` is a Vite + React browser app and currently reads `VITE_API_BASE_URL`.
- `apps/api` is a Fastify HTTP service and currently assumes a workspace root plus a `.env` at repo root.
- `apps/worker` is a BullMQ worker process with the same workspace-root assumption.
- `tooling/scripts/start-backend-stack.mjs` already acts as a parent process for `redis-memory-server`, API, and worker child processes.
- `packages/services/src/storage/local-data-paths.ts` currently derives all persistent data paths from one `workspaceRoot`.

**Recommended Approach**

Use Tauri as a Windows desktop shell only. Keep the backend stack as Node processes launched by one packaged parent process. This reuses the current architecture, minimizes risky code movement, and keeps Redis/BullMQ behavior unchanged.

The packaged desktop app should run like this:

1. Tauri starts and checks whether a workspace directory has already been selected.
2. If not, it blocks entry into the main UI and prompts the user to choose one.
3. Tauri launches one packaged Node parent process.
4. That parent process reads `.env` from the selected workspace directory and starts:
   - `redis-memory-server`
   - API
   - worker
5. The frontend calls the packaged API over `http://127.0.0.1:13000`.
6. On desktop shutdown, Tauri stops the parent process, which then kills the backend process tree.

**Why This Approach**

- It preserves the existing service boundaries.
- It avoids a high-risk rewrite of queueing and background execution.
- It keeps production runtime logic close to the already working smoke/start scripts.
- It lets the first release focus on packaging, runtime paths, and lifecycle instead of domain refactors.

**Rejected Alternatives**

`Tauri + dev-mode services`

Do not ship `tsx`, Vite dev server, and source-entry scripts as the runtime model. That would be fragile, slower to start, and much harder to package reliably.

`Collapse API and worker into Tauri`

Do not rewrite the backend into Tauri commands or Rust for the first release. That would create unnecessary surface area and slow down the goal of getting a working Windows installer.

`Write runtime data into the install directory`

Do not treat the installation path as writable workspace state. Standard Windows installer locations such as `Program Files` are not reliably writable for normal users.

**Runtime Packaging Model**

The installer should contain two classes of files.

Read-only packaged resources:

- Tauri executable and config
- packaged Studio frontend assets
- bundled `node.exe`
- built API output
- built worker output
- Node runtime dependencies required by those builds
- prompt templates and other static runtime resources

Writable workspace content selected by the user:

- `.env`
- SQLite database
- project scripts and assets
- generated images
- generated videos
- task artifacts and raw provider responses
- runtime status files such as the Redis URL handoff file
- logs

This keeps the install payload immutable and pushes all large or user-owned data into a user-chosen directory that can live off C drive.

**Workspace Directory Model**

The chosen workspace directory becomes the effective runtime `workspaceRoot`.

Expected contents under the workspace root:

```text
<workspace>/
  .env
  .local-data/
    sqlite/
    projects/
    logs/
  .runtime/
    redis-url.txt
    backend/
```

Rules:

- Backend code reads `.env` from `<workspace>/.env`.
- `createLocalDataPaths()` continues to work by receiving the workspace directory instead of the repo root.
- Prompt templates remain packaged resources and are not copied into the workspace.
- Runtime-only handoff files move out of repo-local `.codex-runtime/` into a workspace runtime folder.

**Remembering The Workspace**

The app must remember the selected workspace across launches. Only the workspace pointer should be stored in lightweight desktop config state. Large media, SQLite, logs, and generated files must remain in the user-selected workspace directory.

This keeps the convenience of a persistent selection without violating the constraint against pushing large data into `AppData`.

**Frontend Runtime Design**

`apps/studio` should build as a normal production Vite app and be embedded into Tauri.

Required frontend behavior:

- In desktop builds, use the local packaged API base URL `http://127.0.0.1:13000`.
- Keep the existing HTTP API client shape for the first release.
- Show a blocking first-run state until the workspace is selected and backend startup is complete.
- Surface backend startup failures clearly so users know whether the issue is a missing `.env`, a bad workspace, or a port conflict.

The first release does not need a full settings screen. A simple first-run chooser plus startup error state is enough.

**Backend Runtime Design**

Introduce one production backend launcher that replaces the current dev-only `tsx` entry chain.

Responsibilities:

- accept the selected workspace path explicitly
- load `.env` from that workspace
- resolve runtime directories inside the workspace
- start Redis, API, and worker as child processes
- forward enough logs for diagnostics
- kill the full child process tree on exit

The launcher should reuse the existing `start-backend-stack.mjs` behavior where possible, but it must stop depending on repo-local source paths and dev-only `node_modules/.bin` assumptions.

**API Changes**

The API already supports `buildApp({ dataRoot, redisUrl, studioOrigin })`. The desktop packaging work should lean into that instead of adding a separate code path.

Required changes:

- allow runtime env loading from an explicit `.env` file path
- accept a packaged-resource root for prompt templates if current `workspaceRoot` assumptions leak into template loading
- allow the desktop WebView origin(s) in CORS
- keep serving local asset content over the existing HTTP routes

The API should remain reachable only on loopback for the first release.

**Worker Changes**

The worker should keep its BullMQ topology and provider behavior unchanged.

Required changes:

- accept explicit workspace and env-file inputs instead of inferring repo root
- keep resolving Redis through the runtime handoff file or explicit env
- run from compiled JavaScript output instead of source + `tsx`

The worker mode selection logic can stay the same: real when tokens are present, smoke otherwise.

**Environment Loading**

The current `tooling/env/load-env.mjs` is repo-root oriented. The desktop release needs a parameterized version.

Rules:

- `.env` is read from `<workspace>/.env`
- installer payload must not include `.env`
- environment variables from the desktop process may still override `.env` values when already present
- missing `.env` should produce a clear startup error, not a silent partial boot

This keeps desktop runtime behavior aligned with current development assumptions while moving the file to the user-managed workspace.

**Build And Packaging Flow**

The desktop build should become a repeatable root-level command.

High-level flow:

1. Build `apps/studio`.
2. Build `apps/api`.
3. Build `apps/worker`.
4. Prepare a desktop runtime bundle containing:
   - `node.exe`
   - built backend files
   - required runtime `node_modules`
   - prompt templates and static resources
5. Build the Tauri Windows installer.

The repository should gain explicit packaging scripts instead of relying on manual file copying.

**Lifecycle And Error Handling**

Startup failures must be explicit and recoverable.

Required cases:

- no workspace selected yet
- `.env` missing from workspace
- required backend port already in use
- Redis fails to start
- API fails to bind
- worker fails to start

Expected behavior:

- first-run workspace selection blocks the main app until complete
- startup failure shows a human-readable message in the desktop shell
- app shutdown terminates the backend parent and all descendants
- child-process exit while the app is open should be treated as fatal for the desktop session

**Logging**

The first release should write logs into the selected workspace so the installation directory stays clean and users can zip one folder for troubleshooting.

Suggested layout:

```text
<workspace>/
  .local-data/
    logs/
      desktop.log
      backend.log
      api.log
      worker.log
```

This is enough for the first packaged release. Sophisticated log rotation is not required yet.

**Security Posture**

- bind API only to `127.0.0.1`
- do not expose Redis beyond loopback
- do not bundle secrets in the installer
- keep generated assets behind the existing authenticated-local desktop flow for now

The first release is a local desktop tool, not a hardened multi-user host. The design should stay narrow and pragmatic.

**Testing**

Add focused coverage for:

- explicit workspace `.env` loading
- packaged backend launcher path resolution
- first-run workspace selection behavior in the desktop shell
- frontend desktop API base URL selection
- backend stack shutdown when the desktop app exits

Manual acceptance should verify:

1. Install on Windows without preinstalled Node or Redis.
2. First launch requires workspace selection.
3. Placing `.env` in the chosen workspace is sufficient for startup.
4. API and worker start automatically.
5. Studio can complete a representative project flow.
6. SQLite, media, logs, and runtime files stay under the workspace.
7. Closing the desktop app leaves no orphan backend processes.

**Open Implementation Choices**

- Exact mechanism for storing the remembered workspace pointer in lightweight desktop config.
- Exact packaging script for bundling `node.exe` and runtime `node_modules`.
- Exact desktop WebView origin string(s) to allow in API CORS, to be confirmed against the chosen Tauri version during implementation.

These are implementation details, not design blockers. They should be resolved in the plan and first code pass without changing the overall architecture.
