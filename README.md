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

Run tests:

```bash
corepack pnpm test
```

Run type checks:

```bash
corepack pnpm typecheck
```

Set `REDIS_URL` before starting the API or worker when you want real queue processing:

```bash
set REDIS_URL=redis://127.0.0.1:6379
```

On macOS/Linux:

```bash
export REDIS_URL=redis://127.0.0.1:6379
```

Local SQLite data and project files are written under `.local-data/`.

Windows development should use Docker Redis or Memurai for local Redis.
