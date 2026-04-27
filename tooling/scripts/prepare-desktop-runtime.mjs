import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
const runtimeRoot = path.join(workspaceRoot, "desktop-runtime");
const backendRoot = path.join(runtimeRoot, "backend");
const nodeRoot = path.join(runtimeRoot, "node");
const execFileAsync = promisify(execFile);

const backendEntries = [
  "apps",
  "packages",
  "prompt-templates",
  "tooling",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
];

await fs.rm(runtimeRoot, { recursive: true, force: true });
await fs.mkdir(backendRoot, { recursive: true });
await fs.mkdir(nodeRoot, { recursive: true });

await Promise.all(
  backendEntries.map(async (entry) => {
    await copyPath(path.join(workspaceRoot, entry), path.join(backendRoot, entry));
  }),
);

await copyCurrentNodeRuntime();
await installRuntimeDependencies();
await pruneRuntimeInstallArtifacts();

console.log(`Desktop runtime prepared at ${path.relative(workspaceRoot, runtimeRoot)}`);

async function copyPath(from, to) {
  const stat = await fs.stat(from);
  const fromRoot = from.replaceAll("\\", "/");

  if (stat.isDirectory()) {
    await fs.cp(from, to, {
      dereference: true,
      recursive: true,
      filter(source) {
        const normalized = source.replaceAll("\\", "/");
        const relativeSource = path.posix.relative(fromRoot, normalized);
        return !(
          normalized.includes("/.git") ||
          normalized.includes("/dist") ||
          normalized.includes("/coverage") ||
          normalized.includes("/.ignored_") ||
          normalized.includes("/.local-data") ||
          normalized.includes("/.codex-runtime") ||
          normalized.includes("/.vite") ||
          (/(?:^|\/)node_modules(?:\/|$)/u).test(relativeSource) ||
          normalized.includes("/apps/desktop-runtime") ||
          normalized.includes("/apps/desktop/src-tauri/target")
        );
      },
    });
    return;
  }

  await fs.copyFile(from, to);
}

async function copyCurrentNodeRuntime() {
  if (process.platform !== "win32") {
    throw new Error("Windows desktop packaging must run on Windows.");
  }

  const sourceNode = process.execPath;
  const targetNode = path.join(nodeRoot, "node.exe");
  await fs.copyFile(sourceNode, targetNode);
}

async function installRuntimeDependencies() {
  const corepackCommand =
    process.platform === "win32"
      ? path.join(path.dirname(process.execPath), "node_modules", "corepack", "dist", "corepack.js")
      : "corepack";
  const command = process.platform === "win32" ? process.execPath : corepackCommand;
  const args =
    process.platform === "win32"
      ? [corepackCommand, "pnpm", "install", "--prod=false", "--frozen-lockfile"]
      : ["pnpm", "install", "--prod=false", "--frozen-lockfile"];

  await execFileAsync(command, args, {
    cwd: backendRoot,
    env: {
      ...process.env,
      npm_config_node_linker: "hoisted",
    },
    windowsHide: true,
  });
}

async function pruneRuntimeInstallArtifacts() {
  await pruneMatchingDirectories(backendRoot, (name) =>
    name.startsWith(".ignored_") || name === ".vite" || name === ".cache",
  );
}

async function pruneMatchingDirectories(root, shouldPrune) {
  const entries = await fs.readdir(root, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);

      if (!entry.isDirectory()) {
        return;
      }

      if (shouldPrune(entry.name)) {
        await fs.rm(entryPath, { recursive: true, force: true });
        return;
      }

      await pruneMatchingDirectories(entryPath, shouldPrune);
    }),
  );
}
