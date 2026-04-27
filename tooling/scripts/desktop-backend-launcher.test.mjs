import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  createDesktopBackendLaunchConfig,
  createDesktopBackendProcess,
} from "./desktop-backend-launcher.mjs";

test("creates a Windows desktop backend launch config", () => {
  const appDataDir = path.join("C:", "Users", "Example", "AppData", "Roaming", "SweetStar");
  const resourceDir = path.join("C:", "Program Files", "SweetStar", "resources");
  const config = createDesktopBackendLaunchConfig({
    appDataDir,
    resourceDir,
  });

  assert.equal(config.command, path.join(resourceDir, "desktop-runtime", "node", "node.exe"));
  assert.deepEqual(config.args, [
    path.join(resourceDir, "desktop-runtime", "backend", "start-backend-stack.mjs"),
  ]);
  assert.equal(config.cwd, path.join(resourceDir, "desktop-runtime", "backend"));
  assert.equal(config.env.SWEETSTAR_DESKTOP, "1");
  assert.equal(config.env.SWEETSTAR_APP_DATA_DIR, appDataDir);
  assert.equal(config.env.SWEETSTAR_WORKSPACE_ROOT, config.cwd);
  assert.equal(config.env.STUDIO_ORIGIN, "tauri://localhost,http://127.0.0.1:14273,http://localhost:5173");
});

test("creates a backend child process using the injected spawner", () => {
  const calls = [];
  const child = { pid: 1234 };
  const processHandle = createDesktopBackendProcess({
    appDataDir: "C:\\SweetStarData",
    resourceDir: "C:\\SweetStarResources",
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return child;
    },
  });

  assert.equal(processHandle, child);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.windowsHide, true);
  assert.equal(calls[0].options.stdio, "ignore");
  assert.equal(calls[0].options.detached, false);
  assert.equal(calls[0].options.env.SWEETSTAR_DESKTOP, "1");
});
