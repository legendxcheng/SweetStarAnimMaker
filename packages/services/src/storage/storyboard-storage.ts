import fs from "node:fs/promises";
import path from "node:path";

import {
  currentMasterPlotJsonRelPath,
  currentMasterPlotMarkdownRelPath,
  type MasterPlotStorage,
  type StoryboardStorage,
} from "@sweet-star/core";
import type { CurrentMasterPlot } from "@sweet-star/shared";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateStoryboardStorageOptions {
  paths: LocalDataPaths;
}

const promptTemplateDirectoryName = "prompt-templates";
const promptSnapshotFileName = "prompt-snapshot.json";
const rawResponseFileName = "raw-response.txt";
const defaultPromptTemplates = {
  "master_plot.generate": "Turn this premise into a master plot:\n{{premiseText}}",
} as const;

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
      const promptTemplatePath = toPromptTemplatePath(input.storageDir, input.promptTemplateKey);

      await ensureParentDirectory(promptTemplatePath);
      await fs.writeFile(
        promptTemplatePath,
        defaultPromptTemplates[input.promptTemplateKey],
        "utf8",
      );
    },
    async readPromptTemplate(input) {
      return fs.readFile(
        toPromptTemplatePath(input.storageDir, input.promptTemplateKey),
        "utf8",
      );
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

  function toPromptTemplatePath(
    storageDir: string,
    promptTemplateKey: keyof typeof defaultPromptTemplates,
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
