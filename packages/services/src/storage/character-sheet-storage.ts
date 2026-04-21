import fs from "node:fs/promises";
import path from "node:path";

import {
  CharacterReferenceImageNotFoundError,
  toCharacterSheetReferenceManifestRelPath,
  toCharacterSheetReferencesStorageDir,
  type CharacterReferenceImage,
  type CharacterSheetStorage,
  type CharacterSheetRecord,
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
      const batchScopedMetadataPath = await findBatchScopedCurrentMetadataPath(input);
      const legacyMetadataPath = options.paths.projectCharacterSheetAssetPath(
        input.storageDir,
        `character-sheets/characters/${input.characterId}/current.json`,
      );

      for (const candidatePath of [batchScopedMetadataPath, legacyMetadataPath]) {
        if (!candidatePath) {
          continue;
        }

        try {
          return JSON.parse(await fs.readFile(candidatePath, "utf8")) as CharacterSheetRecord;
        } catch (error) {
          if (isMissingFileError(error)) {
            continue;
          }

          throw error;
        }
      }

      return null;
    },
    async listReferenceImages(input) {
      return readReferenceManifest(input.character);
    },
    async saveReferenceImages(input) {
      const existingReferenceImages = await readReferenceManifest(input.character);
      let nextSequence = await readNextReferenceSequence(input.character, existingReferenceImages);
      const storedReferenceImages: CharacterReferenceImage[] = [];

      for (const file of input.files) {
        const sequenceText = String(nextSequence).padStart(3, "0");
        const extension = toReferenceImageExtension(file.originalFileName, file.mimeType);
        const fileName = `ref-${sequenceText}${extension}`;
        const referenceImage: CharacterReferenceImage = {
          id: `ref_${sequenceText}`,
          fileName,
          originalFileName: file.originalFileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          createdAt: file.createdAt,
        };
        const referenceImagePath = toReferenceImagePath(input.character, fileName);

        await ensureParentDirectory(referenceImagePath);
        await fs.writeFile(referenceImagePath, file.contentBytes);
        storedReferenceImages.push(referenceImage);
        nextSequence += 1;
      }

      const allReferenceImages = [...existingReferenceImages, ...storedReferenceImages];
      await writeNextReferenceSequence(input.character, nextSequence);
      await writeReferenceManifest(input.character, allReferenceImages);
      return allReferenceImages;
    },
    async deleteReferenceImage(input) {
      const existingReferenceImages = await readReferenceManifest(input.character);
      const referenceImageToDelete = existingReferenceImages.find(
        (entry) => entry.id === input.referenceImageId,
      );

      if (!referenceImageToDelete) {
        throw new CharacterReferenceImageNotFoundError(input.referenceImageId);
      }

      await fs.rm(toReferenceImagePath(input.character, referenceImageToDelete.fileName), {
        force: false,
      });

      const remainingReferenceImages = existingReferenceImages.filter(
        (entry) => entry.id !== input.referenceImageId,
      );
      await writeNextReferenceSequence(
        input.character,
        await readNextReferenceSequence(input.character, existingReferenceImages),
      );
      await writeReferenceManifest(input.character, remainingReferenceImages);
      return remainingReferenceImages;
    },
    async resolveReferenceImagePaths(input) {
      const referenceImages = await readReferenceManifest(input.character);

      return referenceImages.map((referenceImage) =>
        toReferenceImagePath(input.character, referenceImage.fileName),
      );
    },
    async getReferenceImageContent(input) {
      const referenceImages = await readReferenceManifest(input.character);
      const referenceImage = referenceImages.find((entry) => entry.id === input.referenceImageId);

      if (!referenceImage) {
        return null;
      }

      return {
        filePath: toReferenceImagePath(input.character, referenceImage.fileName),
        fileName: referenceImage.fileName,
        mimeType: referenceImage.mimeType,
      };
    },
    async getImageContent(input) {
      const filePath = options.paths.projectCharacterSheetAssetPath(
        input.character.projectStorageDir,
        input.character.currentImageRelPath,
      );

      try {
        await fs.access(filePath);
      } catch (error) {
        if (isMissingFileError(error)) {
          return null;
        }

        throw error;
      }

      return {
        filePath,
        fileName: path.basename(input.character.currentImageRelPath),
        mimeType: toImageMimeType(input.character.currentImageRelPath),
      };
    },
  };

  async function readReferenceManifest(character: {
    projectStorageDir: string;
    batchId: string;
    id: string;
  }) {
    const manifestPath = toReferenceManifestPath(character);

    try {
      return JSON.parse(await fs.readFile(manifestPath, "utf8")) as CharacterReferenceImage[];
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  async function writeReferenceManifest(
    character: {
      projectStorageDir: string;
      batchId: string;
      id: string;
    },
    referenceImages: CharacterReferenceImage[],
  ) {
    const manifestPath = toReferenceManifestPath(character);

    await ensureParentDirectory(manifestPath);
    await fs.writeFile(manifestPath, JSON.stringify(referenceImages, null, 2), "utf8");
  }

  function toReferenceManifestPath(character: {
    projectStorageDir: string;
    batchId: string;
    id: string;
  }) {
    return options.paths.projectCharacterSheetAssetPath(
      character.projectStorageDir,
      toCharacterSheetReferenceManifestRelPath(character.batchId, character.id),
    );
  }

  function toReferenceSequencePath(character: {
    projectStorageDir: string;
    batchId: string;
    id: string;
  }) {
    return options.paths.projectCharacterSheetAssetPath(
      character.projectStorageDir,
      `${toCharacterSheetReferencesStorageDir(character.batchId, character.id)}/next-sequence.txt`,
    );
  }

  async function readNextReferenceSequence(
    character: {
      projectStorageDir: string;
      batchId: string;
      id: string;
    },
    referenceImages: CharacterReferenceImage[],
  ) {
    const fallbackSequence = getNextReferenceSequenceFromManifest(referenceImages);
    const sequencePath = toReferenceSequencePath(character);

    try {
      const storedSequence = Number.parseInt(await fs.readFile(sequencePath, "utf8"), 10);

      if (Number.isFinite(storedSequence) && storedSequence > 0) {
        return Math.max(storedSequence, fallbackSequence);
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }

    return fallbackSequence;
  }

  async function writeNextReferenceSequence(
    character: {
      projectStorageDir: string;
      batchId: string;
      id: string;
    },
    nextSequence: number,
  ) {
    const sequencePath = toReferenceSequencePath(character);

    await ensureParentDirectory(sequencePath);
    await fs.writeFile(sequencePath, String(nextSequence), "utf8");
  }

  function toReferenceImagePath(
    character: {
      projectStorageDir: string;
      batchId: string;
      id: string;
    },
    fileName: string,
  ) {
    return options.paths.projectCharacterSheetAssetPath(
      character.projectStorageDir,
      `${toCharacterSheetReferencesStorageDir(character.batchId, character.id)}/${fileName}`,
    );
  }

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

  async function findBatchScopedCurrentMetadataPath(input: {
    storageDir: string;
    characterId: string;
  }) {
    const batchesDir = options.paths.projectCharacterSheetAssetPath(
      input.storageDir,
      "character-sheets/batches",
    );

    try {
      const entries = await fs.readdir(batchesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const candidatePath = path.join(
          batchesDir,
          entry.name,
          "characters",
          input.characterId,
          "current.json",
        );

        try {
          await fs.access(candidatePath);
          return candidatePath;
        } catch (error) {
          if (!isMissingFileError(error)) {
            throw error;
          }
        }
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }

    return null;
  }
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function getNextReferenceSequenceFromManifest(referenceImages: CharacterReferenceImage[]) {
  const maxSequence = referenceImages.reduce((currentMax, referenceImage) => {
    const match = /^ref-(\d+)\./.exec(referenceImage.fileName);
    const sequence = match ? Number(match[1]) : 0;

    return Math.max(currentMax, sequence);
  }, 0);

  return maxSequence + 1;
}

function toReferenceImageExtension(originalFileName: string, mimeType: string) {
  const fileExtension = path.extname(originalFileName).toLowerCase();

  if (fileExtension) {
    return fileExtension;
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return ".png";
}

function toImageMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "image/png";
  }
}
