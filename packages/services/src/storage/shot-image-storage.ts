import fs from "node:fs/promises";
import path from "node:path";

import type { ShotImageStorage } from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateShotImageStorageOptions {
  paths: LocalDataPaths;
}

export function createShotImageStorage(options: CreateShotImageStorageOptions): ShotImageStorage {
  return {
    async writeBatchManifest(input) {
      const manifestPath = toProjectAssetPath(
        options.paths,
        input.batch.projectStorageDir,
        input.batch.manifestRelPath,
      );

      await ensureParentDirectory(manifestPath);
      await fs.writeFile(manifestPath, JSON.stringify(input.batch, null, 2), "utf8");
    },
    async writeFramePlanning(input) {
      const planningPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        input.frame.planningRelPath,
      );

      await ensureParentDirectory(planningPath);
      await fs.writeFile(planningPath, JSON.stringify(input.planning, null, 2), "utf8");
    },
    async readFramePlanning(input) {
      const planningPath = toProjectAssetPath(
        options.paths,
        input.projectStorageDir,
        input.planningRelPath,
      );

      try {
        return JSON.parse(await fs.readFile(planningPath, "utf8"));
      } catch (error) {
        if (isMissingFileError(error)) {
          return null;
        }

        throw error;
      }
    },
    async writeFramePromptFiles(input) {
      const promptSeedPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        input.frame.promptSeedRelPath,
      );
      const promptCurrentPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        input.frame.promptCurrentRelPath,
      );

      await Promise.all([
        ensureParentDirectory(promptSeedPath),
        ensureParentDirectory(promptCurrentPath),
      ]);
      await fs.writeFile(promptSeedPath, input.frame.promptTextSeed, "utf8");
      await fs.writeFile(promptCurrentPath, input.frame.promptTextCurrent, "utf8");
    },
    async writeFramePromptVersion(input) {
      const versionPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        `${input.frame.promptVersionsStorageDir}/${input.versionTag}.json`,
      );

      await ensureParentDirectory(versionPath);
      await fs.writeFile(
        versionPath,
        JSON.stringify(
          {
            promptText: input.promptText,
            negativePromptText: input.negativePromptText,
          },
          null,
          2,
        ),
        "utf8",
      );
    },
    async writeCurrentImage(input) {
      const imagePath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        input.frame.currentImageRelPath,
      );
      const metadataPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        input.frame.currentMetadataRelPath,
      );

      await Promise.all([ensureParentDirectory(imagePath), ensureParentDirectory(metadataPath)]);
      await fs.writeFile(imagePath, input.imageBytes);
      await fs.writeFile(metadataPath, JSON.stringify(input.metadata, null, 2), "utf8");
    },
    async writeImageVersion(input) {
      const imageVersionPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        `${input.frame.versionsStorageDir}/${input.versionTag}.png`,
      );
      const metadataVersionPath = toProjectAssetPath(
        options.paths,
        input.frame.projectStorageDir,
        `${input.frame.versionsStorageDir}/${input.versionTag}.json`,
      );

      await Promise.all([
        ensureParentDirectory(imageVersionPath),
        ensureParentDirectory(metadataVersionPath),
      ]);
      await fs.writeFile(imageVersionPath, input.imageBytes);
      await fs.writeFile(metadataVersionPath, JSON.stringify(input.metadata, null, 2), "utf8");
    },
    async readCurrentFrame(input) {
      const currentMetadataPath = toProjectAssetPath(
        options.paths,
        input.storageDir,
        `images/frames/${input.frameId}/current.json`,
      );

      try {
        return JSON.parse(await fs.readFile(currentMetadataPath, "utf8"));
      } catch (error) {
        if (isMissingFileError(error)) {
          return null;
        }

        throw error;
      }
    },
    resolveProjectAssetPath(input) {
      return toProjectAssetPath(options.paths, input.projectStorageDir, input.assetRelPath);
    },
  };
}

function toProjectAssetPath(paths: LocalDataPaths, projectStorageDir: string, assetRelPath: string) {
  return path.join(paths.projectPath(projectStorageDir), assetRelPath);
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
