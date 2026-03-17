import fs from "node:fs/promises";

import type { TaskFileStorage } from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateTaskFileStorageOptions {
  paths: LocalDataPaths;
}

export function createTaskFileStorage(
  options: CreateTaskFileStorageOptions,
): TaskFileStorage {
  return {
    async createTaskArtifacts(input) {
      const inputPath = options.paths.projectTaskInputPath(input.task.storageDir);

      await ensureParentDirectory(inputPath);
      await fs.writeFile(inputPath, JSON.stringify(input.input, null, 2), "utf8");
    },
    async writeTaskOutput(input) {
      const outputPath = options.paths.projectTaskOutputPath(input.task.storageDir);

      await ensureParentDirectory(outputPath);
      await fs.writeFile(outputPath, JSON.stringify(input.output, null, 2), "utf8");
    },
    async appendTaskLog(input) {
      const logPath = options.paths.projectTaskLogPath(input.task.storageDir);

      await ensureParentDirectory(logPath);
      await fs.appendFile(logPath, `${input.message}\n`, "utf8");
    },
  };
}
