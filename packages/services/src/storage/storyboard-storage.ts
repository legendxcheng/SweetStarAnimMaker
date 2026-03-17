import fs from "node:fs/promises";

import type { StoryboardStorage } from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateStoryboardStorageOptions {
  paths: LocalDataPaths;
}

export function createStoryboardStorage(
  options: CreateStoryboardStorageOptions,
): StoryboardStorage {
  return {
    async writeRawResponse(input) {
      const rawResponsePath = options.paths.projectStoryboardRawResponsePath(
        input.version.projectStorageDir,
        input.version.rawResponseRelPath,
      );

      await ensureParentDirectory(rawResponsePath);
      await fs.writeFile(rawResponsePath, JSON.stringify(input.rawResponse, null, 2), "utf8");
    },
    async writeStoryboardVersion(input) {
      const versionPath = options.paths.projectStoryboardVersionPath(
        input.version.projectStorageDir,
        input.version.fileRelPath,
      );

      await ensureParentDirectory(versionPath);
      await fs.writeFile(versionPath, JSON.stringify(input.storyboard, null, 2), "utf8");
    },
    async readStoryboardVersion(input) {
      const versionPath = options.paths.projectStoryboardVersionPath(
        input.version.projectStorageDir,
        input.version.fileRelPath,
      );

      return JSON.parse(await fs.readFile(versionPath, "utf8"));
    },
  };
}
