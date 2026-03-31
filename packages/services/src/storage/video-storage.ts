import fs from "node:fs/promises";
import path from "node:path";

import type { VideoStorage } from "@sweet-star/core";
import { videoPromptPlanFileName } from "@sweet-star/core";

import { ensureParentDirectory } from "./fs-utils";
import type { LocalDataPaths } from "./local-data-paths";

const promptSnapshotFileName = "prompt-snapshot.json";
const rawResponseFileName = "raw-response.txt";
const currentBatchFileName = "current-batch.json";

export interface CreateVideoStorageOptions {
  paths: LocalDataPaths;
  fetchFn?: typeof fetch;
  downloadTimeoutMs?: number;
}

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 60_000;

export function createVideoStorage(options: CreateVideoStorageOptions): VideoStorage {
  const fetchFn = options.fetchFn ?? fetch;
  const downloadTimeoutMs = options.downloadTimeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;

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

      return fs.readFile(options.paths.globalPromptTemplatePath(input.promptTemplateKey), "utf8");
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
          { promptText: input.promptText, promptVariables: input.promptVariables },
          null,
          2,
        ),
        "utf8",
      );
    },
    async writePromptPlan(input) {
      const promptPlanPath = path.join(
        options.paths.dataRootDir,
        input.segment.storageDir,
        videoPromptPlanFileName,
      );

      await ensureParentDirectory(promptPlanPath);
      await fs.writeFile(promptPlanPath, JSON.stringify(input.planning, null, 2), "utf8");
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
    async writeBatchManifest(input) {
      const manifestPath = toProjectAssetPath(
        options.paths,
        input.batch.projectStorageDir,
        input.batch.manifestRelPath,
      );
      const currentBatchPath = toProjectAssetPath(
        options.paths,
        input.batch.projectStorageDir,
        `videos/${currentBatchFileName}`,
      );

      await ensureParentDirectory(manifestPath);
      await ensureParentDirectory(currentBatchPath);
      const payload = JSON.stringify(input.batch, null, 2);
      await fs.writeFile(manifestPath, payload, "utf8");
      await fs.writeFile(currentBatchPath, payload, "utf8");
    },
    async writeCurrentVideo(input) {
      const videoPath = toProjectAssetPath(
        options.paths,
        input.segment.projectStorageDir,
        input.segment.currentVideoRelPath,
      );
      const metadataPath = toProjectAssetPath(
        options.paths,
        input.segment.projectStorageDir,
        input.segment.currentMetadataRelPath,
      );
      const thumbnailPath = toProjectAssetPath(
        options.paths,
        input.segment.projectStorageDir,
        input.segment.thumbnailRelPath,
      );

      await ensureParentDirectory(videoPath);
      await ensureParentDirectory(metadataPath);
      await fs.writeFile(videoPath, await downloadAsset(fetchFn, input.videoSourceUrl, downloadTimeoutMs));
      await fs.writeFile(metadataPath, JSON.stringify(input.metadata, null, 2), "utf8");

      if (input.thumbnailSourceUrl) {
        await ensureParentDirectory(thumbnailPath);
        await fs.writeFile(
          thumbnailPath,
          await downloadAsset(fetchFn, input.thumbnailSourceUrl, downloadTimeoutMs),
        );
      }
    },
    async writeVideoVersion(input) {
      const videoVersionPath = toProjectAssetPath(
        options.paths,
        input.segment.projectStorageDir,
        `${input.segment.versionsStorageDir}/${input.versionTag}.mp4`,
      );
      const metadataVersionPath = toProjectAssetPath(
        options.paths,
        input.segment.projectStorageDir,
        `${input.segment.versionsStorageDir}/${input.versionTag}.json`,
      );
      const thumbnailVersionPath = toProjectAssetPath(
        options.paths,
        input.segment.projectStorageDir,
        `${input.segment.versionsStorageDir}/${input.versionTag}.webp`,
      );

      await ensureParentDirectory(videoVersionPath);
      await ensureParentDirectory(metadataVersionPath);
      await fs.writeFile(
        videoVersionPath,
        await downloadAsset(fetchFn, input.videoSourceUrl, downloadTimeoutMs),
      );
      await fs.writeFile(metadataVersionPath, JSON.stringify(input.metadata, null, 2), "utf8");

      if (input.thumbnailSourceUrl) {
        await ensureParentDirectory(thumbnailVersionPath);
        await fs.writeFile(
          thumbnailVersionPath,
          await downloadAsset(fetchFn, input.thumbnailSourceUrl, downloadTimeoutMs),
        );
      }
    },
    async writeFinalCutManifest(input) {
      const manifestPath = toProjectAssetPath(
        options.paths,
        input.finalCut.projectStorageDir,
        input.finalCut.manifestStorageRelPath,
      );

      await ensureParentDirectory(manifestPath);
      await fs.writeFile(manifestPath, `${input.lines.join("\n")}\n`, "utf8");
    },
    async writeFinalCutFiles(input) {
      const currentVideoPath = toProjectAssetPath(
        options.paths,
        input.finalCut.projectStorageDir,
        input.finalCut.currentVideoRelPath,
      );
      const currentMetadataPath = toProjectAssetPath(
        options.paths,
        input.finalCut.projectStorageDir,
        input.finalCut.currentMetadataRelPath,
      );
      const versionVideoPath = toProjectAssetPath(
        options.paths,
        input.finalCut.projectStorageDir,
        `${input.finalCut.versionsStorageDir}/${input.finalCut.id}.mp4`,
      );
      const versionMetadataPath = toProjectAssetPath(
        options.paths,
        input.finalCut.projectStorageDir,
        `${input.finalCut.versionsStorageDir}/${input.finalCut.id}.json`,
      );

      await ensureParentDirectory(currentVideoPath);
      await ensureParentDirectory(currentMetadataPath);
      await ensureParentDirectory(versionVideoPath);
      await ensureParentDirectory(versionMetadataPath);
      await fs.writeFile(currentVideoPath, input.videoContent);
      await fs.writeFile(versionVideoPath, input.videoContent);

      const payload = JSON.stringify(input.finalCut, null, 2);
      await fs.writeFile(currentMetadataPath, payload, "utf8");
      await fs.writeFile(versionMetadataPath, payload, "utf8");
    },
    resolveProjectAssetPath(input) {
      return toProjectAssetPath(options.paths, input.projectStorageDir, input.assetRelPath);
    },
  };

  function toProjectPromptTemplatePath(storageDir: string, promptTemplateKey: string) {
    return path.join(
      options.paths.projectPath(storageDir),
      "prompt-templates",
      `${promptTemplateKey}.txt`,
    );
  }
}

function toProjectAssetPath(paths: LocalDataPaths, projectStorageDir: string, assetRelPath: string) {
  return path.join(paths.projectPath(projectStorageDir), assetRelPath);
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function downloadAsset(fetchFn: typeof fetch, url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetchFn(url, {
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Video asset download timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to download asset: ${url}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
