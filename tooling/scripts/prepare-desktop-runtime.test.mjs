import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const runtimeRoot = path.resolve("desktop-runtime", "backend");
const runtimeRequire = createRequire(path.join(runtimeRoot, "tooling", "scripts", "start-backend-stack.mjs"));

test("desktop runtime resolves backend dependencies as real files", () => {
  const requiredRuntimeFiles = [
    runtimeRequire.resolve("tsx/cli", {
      paths: [
        path.join(runtimeRoot, "apps", "api"),
        path.join(runtimeRoot, "apps", "worker"),
        runtimeRoot,
      ],
    }),
    runtimeRequire.resolve("redis-memory-server", {
      paths: [path.join(runtimeRoot, "apps", "api"), runtimeRoot],
    }),
  ];

  for (const filePath of requiredRuntimeFiles) {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`);
    assert.equal(
      fs.lstatSync(filePath).isSymbolicLink(),
      false,
      `${filePath} must be copied into the runtime, not linked to the source checkout`,
    );
  }
});
