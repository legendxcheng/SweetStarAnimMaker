import fs from "node:fs/promises";
import path from "node:path";

export async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function removeDirectory(directoryPath: string) {
  await fs.rm(directoryPath, { recursive: true, force: true });
}
