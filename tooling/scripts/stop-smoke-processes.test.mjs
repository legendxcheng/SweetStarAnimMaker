import test from "node:test";
import assert from "node:assert/strict";

import { isSmokeProcessCommandLine } from "./stop-smoke-processes.mjs";

test("matches the smoke backend and frontend launcher processes", () => {
  assert.equal(
    isSmokeProcessCommandLine(
      'node tooling\\scripts\\start-redis-memory.cjs',
    ),
    true,
  );
  assert.equal(
    isSmokeProcessCommandLine(
      'node apps\\api\\node_modules\\tsx\\dist\\cli.mjs tooling\\scripts\\start-api-root.mjs',
    ),
    true,
  );
  assert.equal(
    isSmokeProcessCommandLine(
      'node apps\\worker\\node_modules\\tsx\\dist\\cli.mjs tooling\\scripts\\start-worker-root.mjs',
    ),
    true,
  );
  assert.equal(
    isSmokeProcessCommandLine(
      'node apps\\worker\\node_modules\\tsx\\dist\\cli.mjs tooling\\scripts\\start-worker-smoke.mjs',
    ),
    true,
  );
  assert.equal(
    isSmokeProcessCommandLine(
      'node node_modules\\vite\\bin\\vite.js --host 127.0.0.1 --port 4273',
    ),
    true,
  );
});

test("does not match unrelated node or shell processes", () => {
  assert.equal(
    isSmokeProcessCommandLine(
      'node apps\\worker\\node_modules\\tsx\\dist\\cli.mjs src\\index.ts',
    ),
    false,
  );
  assert.equal(
    isSmokeProcessCommandLine(
      'node some-other-script.mjs',
    ),
    false,
  );
  assert.equal(
    isSmokeProcessCommandLine(
      'cmd.exe /c echo hello',
    ),
    false,
  );
});
