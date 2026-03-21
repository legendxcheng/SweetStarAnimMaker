import fs from "node:fs/promises";
import path from "node:path";

import {
  currentMasterPlotJsonRelPath,
  currentMasterPlotMarkdownRelPath,
  type CurrentMasterPlot,
  type MasterPlotStorage,
  type StoryboardStorage,
} from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateStoryboardStorageOptions {
  paths: LocalDataPaths;
}

const promptTemplateDirectoryName = "prompt-templates";
const promptSnapshotFileName = "prompt-snapshot.json";
const rawResponseFileName = "raw-response.txt";
type PromptTemplateKey = "master_plot.generate";

export function createStoryboardStorage(
  options: CreateStoryboardStorageOptions,
): StoryboardStorage & MasterPlotStorage {
  return {
    async writeRawResponse(input) {
      if ("version" in input) {
        const rawResponsePath = options.paths.projectStoryboardRawResponsePath(
          input.version.projectStorageDir,
          input.version.rawResponseRelPath,
        );

        await ensureParentDirectory(rawResponsePath);
        await fs.writeFile(rawResponsePath, JSON.stringify(input.rawResponse, null, 2), "utf8");
        return;
      }

      const rawResponsePath = path.join(
        options.paths.dataRootDir,
        input.taskStorageDir,
        rawResponseFileName,
      );

      await ensureParentDirectory(rawResponsePath);
      await fs.writeFile(rawResponsePath, input.rawResponse, "utf8");
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
    async writeCurrentMasterPlot(input) {
      const jsonPath = path.join(
        options.paths.projectPath(input.storageDir),
        currentMasterPlotJsonRelPath,
      );
      const markdownPath = path.join(
        options.paths.projectPath(input.storageDir),
        currentMasterPlotMarkdownRelPath,
      );

      await ensureParentDirectory(jsonPath);
      await ensureParentDirectory(markdownPath);
      await fs.writeFile(jsonPath, JSON.stringify(input.masterPlot, null, 2), "utf8");
      await fs.writeFile(markdownPath, renderMasterPlotMarkdown(input.masterPlot), "utf8");
    },
    async readCurrentMasterPlot(input) {
      try {
        const jsonPath = path.join(
          options.paths.projectPath(input.storageDir),
          currentMasterPlotJsonRelPath,
        );

        return JSON.parse(await fs.readFile(jsonPath, "utf8"));
      } catch (error) {
        if (isMissingFileError(error)) {
          return null;
        }

        throw error;
      }
    },
    async writePromptSnapshot(input) {
      const promptSnapshotPath = path.join(
        options.paths.dataRootDir,
        input.taskStorageDir,
        promptSnapshotFileName,
      );

      await ensureParentDirectory(promptSnapshotPath);
      await fs.writeFile(
        promptSnapshotPath,
        JSON.stringify(
          {
            promptText: input.promptText,
            promptVariables: input.promptVariables,
          },
          null,
          2,
        ),
        "utf8",
      );
    },
  };

  function toProjectPromptTemplatePath(
    storageDir: string,
    promptTemplateKey: PromptTemplateKey,
  ) {
    return path.join(
      options.paths.projectPath(storageDir),
      promptTemplateDirectoryName,
      `${promptTemplateKey}.txt`,
    );
  }
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function renderMasterPlotMarkdown(masterPlot: CurrentMasterPlot) {
  const title = masterPlot.title ?? "Untitled";

  return [
    `# ${title}`,
    "",
    `**Logline**`,
    masterPlot.logline,
    "",
    `**Synopsis**`,
    masterPlot.synopsis,
    "",
    `**Main Characters**`,
    masterPlot.mainCharacters.join(", "),
    "",
    `**Core Conflict**`,
    masterPlot.coreConflict,
    "",
    `**Emotional Arc**`,
    masterPlot.emotionalArc,
    "",
    `**Ending Beat**`,
    masterPlot.endingBeat,
    "",
    `**Target Duration (sec)**`,
    masterPlot.targetDurationSec === null ? "Unspecified" : String(masterPlot.targetDurationSec),
    "",
    `**Updated At**`,
    masterPlot.updatedAt,
    "",
    `**Approved At**`,
    masterPlot.approvedAt ?? "Not approved",
    "",
  ].join("\n");
}
