# SweetStarAnimMaker

Initial workspace scaffold for the manga-drama production tool described in `docs/prd/Overall.md`.

Current scope:

- browser-first React application in `apps/studio`
- shared business and service packages in `packages/*`
- shared tooling and documentation directories for later implementation work

This commit establishes only the repository structure. React, Tauri, and runtime tooling are intentionally not initialized yet.

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

Windows development should use Docker Redis or Memurai for local Redis.
