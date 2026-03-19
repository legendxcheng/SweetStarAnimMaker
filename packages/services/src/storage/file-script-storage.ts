import fs from "node:fs/promises";

import type {
  DeletePremiseInput,
  PremiseStorage,
  StoredPremiseMetadata,
  WritePremiseInput,
} from "@sweet-star/core";
import { premiseRelPath } from "@sweet-star/core";

import { ensureParentDirectory, removeDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface FileScriptStorage {
  readPremise(input: DeletePremiseInput): Promise<string>;
  writePremise(input: WritePremiseInput): Promise<StoredPremiseMetadata>;
  readPremiseMetadata(input: DeletePremiseInput): Promise<StoredPremiseMetadata>;
  deletePremise(input: DeletePremiseInput): Promise<void>;
}

export interface CreateFileScriptStorageOptions {
  paths: LocalDataPaths;
}

export function createFileScriptStorage(
  options: CreateFileScriptStorageOptions,
): FileScriptStorage & PremiseStorage {
  return {
    async readPremise(input) {
      return fs.readFile(options.paths.projectPremisePath(input.storageDir), "utf8");
    },
    async writePremise(input) {
      const premisePath = options.paths.projectPremisePath(input.storageDir);

      await ensureParentDirectory(premisePath);
      await fs.writeFile(premisePath, input.premiseText, "utf8");

      return {
        premiseRelPath,
        premiseBytes: Buffer.byteLength(input.premiseText, "utf8"),
      };
    },
    async readPremiseMetadata(input) {
      const premisePath = options.paths.projectPremisePath(input.storageDir);
      const stats = await fs.stat(premisePath);

      return {
        premiseRelPath,
        premiseBytes: stats.size,
      };
    },
    async deletePremise(input) {
      await removeDirectory(options.paths.projectPath(input.storageDir));
    },
  };
}
