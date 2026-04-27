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
    createRequire(
      runtimeRequire.resolve("tsx/cli", {
        paths: [
          path.join(runtimeRoot, "apps", "api"),
          path.join(runtimeRoot, "apps", "worker"),
          runtimeRoot,
        ],
      }),
    ).resolve("esbuild"),
    createRequire(
      runtimeRequire.resolve("redis-memory-server", {
        paths: [path.join(runtimeRoot, "apps", "api"), runtimeRoot],
      }),
    ).resolve("camelcase"),
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

test("desktop runtime materializes package-private dependencies for installer copying", () => {
  const packagePrivateDependencies = [
    runtimeRequire.resolve("esbuild"),
    runtimeRequire.resolve("camelcase"),
  ];

  for (const dependencyPath of packagePrivateDependencies) {
    assert.equal(fs.existsSync(dependencyPath), true, `${dependencyPath} should exist`);
    assert.equal(
      fs.lstatSync(dependencyPath).isSymbolicLink(),
      false,
      `${dependencyPath} must not be a symlink`,
    );
    assert.equal(
      fs.lstatSync(dependencyPath).isDirectory() || fs.lstatSync(dependencyPath).isFile(),
      true,
      `${dependencyPath} should be a directory or file`,
    );
  }
});
