import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");
const runtimeRoot = path.join(workspaceRoot, "desktop-runtime");
const backendRoot = path.join(runtimeRoot, "backend");
const nodeRoot = path.join(runtimeRoot, "node");

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

console.log(`Desktop runtime prepared at ${path.relative(workspaceRoot, runtimeRoot)}`);

async function copyPath(from, to) {
  const stat = await fs.stat(from);

  if (stat.isDirectory()) {
    await fs.cp(from, to, {
      recursive: true,
      filter(source) {
        const normalized = source.replaceAll("\\", "/");
        return !(
          normalized.includes("/.git") ||
          normalized.includes("/dist") ||
          normalized.includes("/coverage") ||
          normalized.includes("/.local-data") ||
          normalized.includes("/.codex-runtime") ||
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
