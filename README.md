# SweetStarAnimMaker

Initial workspace scaffold for the manga-drama production tool described in `docs/prd/Overall.md`.

Current scope:

- browser-first React application in `apps/studio`
- shared business and service packages in `packages/*`
- shared tooling and documentation directories for later implementation work

This commit establishes only the repository structure. React, Tauri, and runtime tooling are intentionally not initialized yet.

## Spec1 API

Install dependencies:

```bash
corepack pnpm install
```

Start the local API:

```bash
corepack pnpm --filter @sweet-star/api dev
```

Run tests:

```bash
corepack pnpm test
```

Run type checks:

```bash
corepack pnpm typecheck
```

Local SQLite data and project files are written under `.local-data/`.
