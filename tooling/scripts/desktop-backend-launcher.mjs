import { spawn as spawnChildProcess } from "node:child_process";
import path from "node:path";

export const desktopStudioOrigin =
  "tauri://localhost,http://127.0.0.1:14273,http://localhost:5173";

export function createDesktopBackendLaunchConfig({
  appDataDir,
  env = process.env,
  resourceDir,
}) {
  if (!appDataDir) {
    throw new Error("appDataDir is required");
  }

  if (!resourceDir) {
    throw new Error("resourceDir is required");
  }

  const runtimeRoot = path.join(resourceDir, "desktop-runtime");
  const backendRoot = path.join(runtimeRoot, "backend");

  return {
    args: [path.join(backendRoot, "tooling", "scripts", "start-backend-stack.mjs")],
    command: path.join(runtimeRoot, "node", "node.exe"),
    cwd: backendRoot,
    env: {
      ...env,
      STUDIO_ORIGIN: env.STUDIO_ORIGIN ?? desktopStudioOrigin,
      SWEETSTAR_APP_DATA_DIR: appDataDir,
      SWEETSTAR_DESKTOP: "1",
      SWEETSTAR_WORKSPACE_ROOT: backendRoot,
    },
  };
}

export function createDesktopBackendProcess({
  appDataDir,
  env,
  resourceDir,
  spawn = spawnChildProcess,
}) {
  const config = createDesktopBackendLaunchConfig({
    appDataDir,
    env,
    resourceDir,
  });

  return spawn(config.command, config.args, {
    cwd: config.cwd,
    detached: false,
    env: config.env,
    stdio: "ignore",
    windowsHide: true,
  });
}
