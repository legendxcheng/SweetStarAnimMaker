import fs from "node:fs/promises";
import path from "node:path";

import {
  currentShotScriptJsonRelPath,
  currentShotScriptMarkdownRelPath,
  type CurrentShotScript,
  type ShotScriptStorage,
} from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

export interface CreateShotScriptStorageOptions {
  paths: LocalDataPaths;
}

const promptSnapshotFileName = "prompt-snapshot.json";
const rawResponseFileName = "raw-response.txt";

export function createShotScriptStorage(
  options: CreateShotScriptStorageOptions,
): ShotScriptStorage {
  return {
    async initializePromptTemplate(input) {
      const projectPromptTemplatePath = toProjectPromptTemplatePath(
        input.storageDir,
        input.promptTemplateKey,
      );
      const globalPromptTemplatePath = options.paths.globalPromptTemplatePath(
        input.promptTemplateKey,
      );

      await ensureParentDirectory(projectPromptTemplatePath);
      await fs.copyFile(globalPromptTemplatePath, projectPromptTemplatePath);
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
    async writeRawResponse(input) {
      const rawResponsePath = path.join(
        options.paths.dataRootDir,
        input.taskStorageDir,
        rawResponseFileName,
      );

      await ensureParentDirectory(rawResponsePath);
      await fs.writeFile(rawResponsePath, input.rawResponse, "utf8");
    },
    async writeShotScriptVersion(input) {
      const { jsonPath, markdownPath } = toVersionPaths(input.storageDir, input.versionId);

      await ensureParentDirectory(jsonPath);
      await ensureParentDirectory(markdownPath);
      await fs.writeFile(jsonPath, JSON.stringify(input.shotScript, null, 2), "utf8");
      await fs.writeFile(markdownPath, renderShotScriptMarkdown(input.shotScript), "utf8");
    },
    async readShotScriptVersion(input) {
      const { jsonPath } = toVersionPaths(input.storageDir, input.versionId);

      return JSON.parse(await fs.readFile(jsonPath, "utf8"));
    },
    async writeCurrentShotScript(input) {
      const jsonPath = path.join(
        options.paths.projectPath(input.storageDir),
        currentShotScriptJsonRelPath,
      );
      const markdownPath = path.join(
        options.paths.projectPath(input.storageDir),
        currentShotScriptMarkdownRelPath,
      );

      await ensureParentDirectory(jsonPath);
      await ensureParentDirectory(markdownPath);
      await fs.writeFile(jsonPath, JSON.stringify(input.shotScript, null, 2), "utf8");
      await fs.writeFile(markdownPath, renderShotScriptMarkdown(input.shotScript), "utf8");
    },
    async readCurrentShotScript(input) {
      try {
        const jsonPath = path.join(
          options.paths.projectPath(input.storageDir),
          currentShotScriptJsonRelPath,
        );

        return JSON.parse(await fs.readFile(jsonPath, "utf8"));
      } catch (error) {
        if (isMissingFileError(error)) {
          return null;
        }

        throw error;
      }
    },
  };

  function toProjectPromptTemplatePath(storageDir: string, promptTemplateKey: string) {
    return path.join(
      options.paths.projectPath(storageDir),
      "prompt-templates",
      `${promptTemplateKey}.txt`,
    );
  }

  function toVersionPaths(storageDir: string, versionId: string) {
    const basePath = path.join(
      options.paths.projectPath(storageDir),
      "shot-script",
      "versions",
      versionId,
    );

    return {
      jsonPath: `${basePath}.json`,
      markdownPath: `${basePath}.md`,
    };
  }
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function renderShotScriptMarkdown(shotScript: CurrentShotScript) {
  const lines = [
    `# ${shotScript.title ?? "Untitled Shot Script"}`,
    "",
    `Source Storyboard: ${shotScript.sourceStoryboardId}`,
    `Updated At: ${shotScript.updatedAt}`,
    `Approved At: ${shotScript.approvedAt ?? "Not approved"}`,
    `Segments: ${shotScript.segmentCount}`,
    `Shots: ${shotScript.shotCount}`,
    "",
  ];

  for (const segment of shotScript.segments) {
    lines.push(
      `## Segment ${segment.order}: ${segment.name ?? segment.segmentId}`,
    );
    lines.push(`Scene / Segment: ${segment.sceneId} / ${segment.segmentId}`);
    lines.push(`Summary: ${segment.summary}`);
    lines.push(`Status: ${segment.status}`);
    lines.push(`Duration (sec): ${segment.durationSec ?? "Unspecified"}`);
    lines.push(`Approved At: ${segment.approvedAt ?? "Not approved"}`);
    lines.push("");

    for (const shot of segment.shots) {
      lines.push(`### ${shot.order}. ${shot.shotCode}`);
      lines.push(`Purpose: ${shot.purpose}`);
      lines.push(`Subject: ${shot.subject}`);
      lines.push(`Visual: ${shot.visual}`);
      lines.push(`Action: ${shot.action}`);
      lines.push(`Dialogue: ${shot.dialogue ?? "(none)"}`);
      lines.push(`OS: ${shot.os ?? "(none)"}`);
      lines.push(`Audio: ${shot.audio ?? "(none)"}`);
      lines.push(`Transition Hint: ${shot.transitionHint ?? "(none)"}`);
      lines.push(`Continuity: ${shot.continuityNotes ?? "(none)"}`);
      lines.push(`Duration (sec): ${shot.durationSec ?? "Unspecified"}`);
      lines.push("");
    }

    lines.push("");
  }

  return lines.join("\n");
}
