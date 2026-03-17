import fs from "node:fs/promises";

import type {
  DeleteOriginalScriptInput,
  StoredScriptMetadata,
  WriteOriginalScriptInput,
} from "@sweet-star/core";
import { originalScriptRelPath } from "@sweet-star/core";

import { ensureParentDirectory, removeDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface FileScriptStorage {
  readOriginalScript(input: DeleteOriginalScriptInput): Promise<string>;
  writeOriginalScript(input: WriteOriginalScriptInput): Promise<StoredScriptMetadata>;
  readScriptMetadata(input: DeleteOriginalScriptInput): Promise<StoredScriptMetadata>;
  deleteOriginalScript(input: DeleteOriginalScriptInput): Promise<void>;
}

export interface CreateFileScriptStorageOptions {
  paths: LocalDataPaths;
}

export function createFileScriptStorage(
  options: CreateFileScriptStorageOptions,
): FileScriptStorage {
  return {
    async readOriginalScript(input) {
      return fs.readFile(
        options.paths.projectOriginalScriptPath(input.storageDir),
        "utf8",
      );
    },
    async writeOriginalScript(input) {
      const scriptPath = options.paths.projectOriginalScriptPath(input.storageDir);

      await ensureParentDirectory(scriptPath);
      await fs.writeFile(scriptPath, input.script, "utf8");

      return {
        scriptRelPath: originalScriptRelPath,
        scriptBytes: Buffer.byteLength(input.script, "utf8"),
      };
    },
    async readScriptMetadata(input) {
      const scriptPath = options.paths.projectOriginalScriptPath(input.storageDir);
      const stats = await fs.stat(scriptPath);

      return {
        scriptRelPath: originalScriptRelPath,
        scriptBytes: stats.size,
      };
    },
    async deleteOriginalScript(input) {
      await removeDirectory(options.paths.projectPath(input.storageDir));
    },
  };
}
