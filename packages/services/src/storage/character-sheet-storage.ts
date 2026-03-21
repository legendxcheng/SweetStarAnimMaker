import fs from "node:fs/promises";
import path from "node:path";

import type {
  CharacterSheetStorage,
  CharacterSheetRecord,
} from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateCharacterSheetStorageOptions {
  paths: LocalDataPaths;
}

type PromptTemplateKey =
  | "character_sheet.prompt.generate"
  | "character_sheet.turnaround.generate";

export function createCharacterSheetStorage(
  options: CreateCharacterSheetStorageOptions,
): CharacterSheetStorage {
  return {
    async initializePromptTemplate(input) {
      const promptTemplatePath = toProjectPromptTemplatePath(
        input.storageDir,
        input.promptTemplateKey,
      );
      const globalPromptTemplatePath = options.paths.globalPromptTemplatePath(
        input.promptTemplateKey,
      );

      await ensureParentDirectory(promptTemplatePath);
      await fs.copyFile(globalPromptTemplatePath, promptTemplatePath);
    },
    async readPromptTemplate(input) {
      const projectPromptTemplatePath = toProjectPromptTemplatePath(
        input.storageDir,
        input.promptTemplateKey,
      );

      try {
        return await fs.readFile(projectPromptTemplatePath, "utf8");
      } catch (error) {
        if (!isMissingFileError(error)) {
          throw error;
        }
      }

      try {
        return await fs.readFile(
          options.paths.globalPromptTemplatePath(input.promptTemplateKey),
          "utf8",
        );
      } catch (error) {
        if (isMissingFileError(error)) {
          throw new Error(`Prompt template not found: ${input.promptTemplateKey}`);
        }

        throw error;
      }
    },
    async writeBatchManifest(input) {
      const manifestPath = options.paths.projectCharacterSheetBatchManifestPath(
        input.batch.projectStorageDir,
        input.batch.manifestRelPath,
      );

      await ensureParentDirectory(manifestPath);
      await fs.writeFile(manifestPath, JSON.stringify(input.batch, null, 2), "utf8");
    },
    async writeGeneratedPrompt(input) {
      const promptGeneratedPath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        input.character.promptGeneratedRelPath,
      );
      const promptCurrentPath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        input.character.promptCurrentRelPath,
      );
      const promptVariablesPath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        input.character.promptVariablesRelPath,
      );

      await Promise.all([
        ensureParentDirectory(promptGeneratedPath),
        ensureParentDirectory(promptCurrentPath),
        ensureParentDirectory(promptVariablesPath),
      ]);
      await fs.writeFile(promptGeneratedPath, input.character.promptTextGenerated, "utf8");
      await fs.writeFile(promptCurrentPath, input.character.promptTextCurrent, "utf8");
      await fs.writeFile(
        promptVariablesPath,
        JSON.stringify(input.promptVariables, null, 2),
        "utf8",
      );
    },
    async writeImageVersion(input) {
      const imageVersionPath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        `${input.character.versionsStorageDir}/${input.versionTag}.png`,
      );
      const metadataVersionPath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        `${input.character.versionsStorageDir}/${input.versionTag}.json`,
      );

      await Promise.all([
        ensureParentDirectory(imageVersionPath),
        ensureParentDirectory(metadataVersionPath),
      ]);
      await fs.writeFile(imageVersionPath, input.imageBytes);
      await fs.writeFile(metadataVersionPath, JSON.stringify(input.metadata, null, 2), "utf8");
    },
    async writeCurrentImage(input) {
      const imagePath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        input.character.currentImageRelPath,
      );
      const metadataPath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        input.character.currentMetadataRelPath,
      );

      await Promise.all([ensureParentDirectory(imagePath), ensureParentDirectory(metadataPath)]);
      await fs.writeFile(imagePath, input.imageBytes);
      await fs.writeFile(metadataPath, JSON.stringify(input.metadata, null, 2), "utf8");
    },
    async readCurrentCharacterSheet(input) {
      try {
        const currentMetadataPath = options.paths.projectCharacterSheetAssetPath(
          input.storageDir,
          `character-sheets/characters/${input.characterId}/current.json`,
        );

        return JSON.parse(await fs.readFile(currentMetadataPath, "utf8")) as CharacterSheetRecord;
      } catch (error) {
        if (isMissingFileError(error)) {
          return null;
        }

        throw error;
      }
    },
  };

  function toProjectPromptTemplatePath(storageDir: string, promptTemplateKey: PromptTemplateKey) {
    if (promptTemplateKey === "character_sheet.turnaround.generate") {
      return path.join(
        options.paths.projectPath(storageDir),
        "prompts",
        "character-sheet",
        "turnaround",
        "project",
        "active.template.txt",
      );
    }

    return path.join(
      options.paths.projectPath(storageDir),
      "prompts",
      "character-sheet",
      "prompt",
      "project",
      "active.template.txt",
    );
  }
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
