import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createShotReferenceBatchRecord,
  createShotReferenceRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createShotImageStorage } from "../src/index";

describe("shot image storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("writes frame planning, prompt assets, and image assets inside the shot frame directory", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-images-"));
    tempDirs.push(tempDir);

    const storage = createShotImageStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const batch = createShotReferenceBatchRecord({
      id: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      shotCount: 1,
      totalRequiredFrameCount: 1,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const shot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 3,
      frameDependency: "start_frame_only",
      startFrame: {
        selectedCharacterIds: ["char_rin_1"],
        matchedReferenceImagePaths: [
          "character-sheets/batches/char_batch_v1/characters/char_rin_1/current.png",
        ],
        unmatchedCharacterIds: ["char_ivo_2"],
        promptTextSeed: "雨夜市场入口，林站在霓虹雨幕前。",
        promptTextCurrent: "雨夜市场入口，林站在霓虹雨幕前，电影感光影。",
        negativePromptTextCurrent: "低清晰度、重复人物",
        sourceTaskId: "task_frame_prompt_1",
      },
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const frame = shot.startFrame;

    await storage.writeBatchManifest({ batch });
    await storage.writeFramePlanning({
      frame,
      planning: {
        selectedCharacterIds: frame.selectedCharacterIds,
        matchedReferenceImagePaths: frame.matchedReferenceImagePaths,
        unmatchedCharacterIds: frame.unmatchedCharacterIds,
      },
    });
    await storage.writeFramePromptFiles({ frame });
    await storage.writeFramePromptVersion({
      frame,
      versionTag: "task_frame_prompt_1",
      promptText: frame.promptTextCurrent,
      negativePromptText: frame.negativePromptTextCurrent,
    });
    await storage.writeCurrentImage({
      frame,
      imageBytes: new Uint8Array([1, 2, 3]),
      metadata: { width: 1920, height: 1080, provider: "turnaround-image" },
    });
    await storage.writeImageVersion({
      frame,
      versionTag: "task_frame_image_1",
      imageBytes: new Uint8Array([4, 5, 6]),
      metadata: { width: 1920, height: 1080, provider: "turnaround-image" },
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "manifest.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"totalFrameCount": 1');
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "manifest.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"shotCount": 1');
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "start-frame",
          "planning.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"char_rin_1"');
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "start-frame",
          "prompt.seed.txt",
        ),
        "utf8",
      ),
    ).resolves.toBe("雨夜市场入口，林站在霓虹雨幕前。");
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "start-frame",
          "prompt.current.txt",
        ),
        "utf8",
      ),
    ).resolves.toBe("雨夜市场入口，林站在霓虹雨幕前，电影感光影。");
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "start-frame",
          "prompt.versions",
          "task_frame_prompt_1.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"negativePromptText": "低清晰度、重复人物"');
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "start-frame",
          "current.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"width": 1920');
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "start-frame",
          "versions",
          "task_frame_image_1.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"provider": "turnaround-image"');
    await expect(
      fs.access(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "images",
          "batches",
          "image_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "end-frame",
        ),
      ),
    ).rejects.toBeDefined();
  });
});
