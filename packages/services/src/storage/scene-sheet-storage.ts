import fs from "node:fs/promises";
import path from "node:path";

import type { SceneSheetStorage } from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateSceneSheetStorageOptions {
  paths: LocalDataPaths;
}

export function createSceneSheetStorage(options: CreateSceneSheetStorageOptions): SceneSheetStorage {
  return {
    async readPromptTemplate(input) {
      const projectPromptTemplatePath = path.join(
        options.paths.projectPath(input.storageDir),
        "prompts",
        "scene-sheet",
        "image",
        "project",
        "active.template.txt",
      );

      try {
        return await fs.readFile(projectPromptTemplatePath, "utf8");
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
          throw error;
        }
      }

      try {
        return await fs.readFile(options.paths.globalPromptTemplatePath(input.promptTemplateKey), "utf8");
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          throw new Error(`Prompt template not found: ${input.promptTemplateKey}`);
        }

        throw error;
      }
    },
    async writeBatchManifest(input) {
      const manifestPath = toProjectAssetPath(
        options.paths,
        input.batch.projectStorageDir,
        input.batch.manifestRelPath,
      );

      await ensureParentDirectory(manifestPath);
      await fs.writeFile(manifestPath, JSON.stringify(input.batch, null, 2), "utf8");
    },
    async writeGeneratedPrompt(input) {
      const promptGeneratedPath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        input.scene.promptGeneratedRelPath,
      );
      const promptCurrentPath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        input.scene.promptCurrentRelPath,
      );
      const promptVariablesPath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        input.scene.promptVariablesRelPath,
      );

      await Promise.all([
        ensureParentDirectory(promptGeneratedPath),
        ensureParentDirectory(promptCurrentPath),
        ensureParentDirectory(promptVariablesPath),
      ]);
      await fs.writeFile(promptGeneratedPath, input.scene.promptTextGenerated, "utf8");
      await fs.writeFile(promptCurrentPath, input.scene.promptTextCurrent, "utf8");
      await fs.writeFile(promptVariablesPath, JSON.stringify(input.promptVariables, null, 2), "utf8");
    },
    async writeImageVersion(input) {
      const imageVersionPath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        `${input.scene.versionsStorageDir}/${input.versionTag}.png`,
      );
      const metadataVersionPath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        `${input.scene.versionsStorageDir}/${input.versionTag}.json`,
      );

      await Promise.all([
        ensureParentDirectory(imageVersionPath),
        ensureParentDirectory(metadataVersionPath),
      ]);
      await fs.writeFile(imageVersionPath, input.imageBytes);
      await fs.writeFile(metadataVersionPath, JSON.stringify(input.metadata, null, 2), "utf8");
    },
    async writeCurrentImage(input) {
      const imagePath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        input.scene.currentImageRelPath,
      );
      const metadataPath = toProjectAssetPath(
        options.paths,
        input.scene.projectStorageDir,
        input.scene.currentMetadataRelPath,
      );

      await Promise.all([ensureParentDirectory(imagePath), ensureParentDirectory(metadataPath)]);
      await fs.writeFile(imagePath, input.imageBytes);
      await fs.writeFile(metadataPath, JSON.stringify(input.metadata, null, 2), "utf8");
    },
  };
}

function toProjectAssetPath(paths: LocalDataPaths, projectStorageDir: string, assetRelPath: string) {
  return path.join(paths.projectPath(projectStorageDir), assetRelPath);
}
