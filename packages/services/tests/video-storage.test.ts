import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createSegmentVideoRecord,
  createVideoBatchRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLocalDataPaths, createVideoStorage } from "../src/index";

const tempDirs: string[] = [];

describe("video storage", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  });

  it("writes current batch manifest, current video assets, and versioned assets inside the shot directory", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-videos-"));
    tempDirs.push(tempDir);
    await fs.mkdir(path.join(tempDir, "prompt-templates"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, "prompt-templates", "segment_video.generate.txt"),
      "Start {{start_frame_path}} End {{end_frame_path}}",
      "utf8",
    );
    const paths = createLocalDataPaths(tempDir);
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    });
    const storage = createVideoStorage({
      paths,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const batch = createVideoBatchRecord({
      id: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      shotCount: 1,
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
    });
    const segment = createSegmentVideoRecord({
      id: "video_shot_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      segmentId: "segment_1",
      sceneId: "scene_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_frame_only",
      durationSec: 3,
      status: "in_review",
      updatedAt: "2026-03-25T00:05:00.000Z",
      sourceTaskId: "task_segment_1",
    });

    await storage.writeBatchManifest({ batch });
    await storage.writeCurrentVideo({
      segment,
      videoSourceUrl: "https://cdn.example/output.mp4",
      thumbnailSourceUrl: "https://cdn.example/output.webp",
      metadata: {
        provider: "vector-engine",
      },
    });
    await storage.writeVideoVersion({
      segment,
      versionTag: "task_segment_1",
      videoSourceUrl: "https://cdn.example/output-v2.mp4",
      thumbnailSourceUrl: "https://cdn.example/output-v2.webp",
      metadata: {
        provider: "vector-engine",
        version: 2,
      },
    });

    await expect(
      fs.readFile(
        path.join(tempDir, ".local-data", "projects", "proj_1-my-story", "videos", "current-batch.json"),
        "utf8",
      ),
    ).resolves.toContain('"id": "video_batch_1"');
    await expect(
      fs.readFile(
        path.join(tempDir, ".local-data", "projects", "proj_1-my-story", "videos", "batches", "video_batch_1", "manifest.json"),
        "utf8",
      ),
    ).resolves.toContain('"shotCount": 1');
    await expect(
      fs.readFile(
        path.join(tempDir, ".local-data", "projects", "proj_1-my-story", "videos", "batches", "video_batch_1", "shots", "scene_1__segment_1__shot_1", "current.json"),
        "utf8",
      ),
    ).resolves.toContain('"provider": "vector-engine"');
    await expect(
      fs.readFile(
        path.join(tempDir, ".local-data", "projects", "proj_1-my-story", "videos", "batches", "video_batch_1", "shots", "scene_1__segment_1__shot_1", "versions", "task_segment_1.json"),
        "utf8",
      ),
    ).resolves.toContain('"version": 2');
  });

  it("aborts hung asset downloads instead of hanging forever", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-videos-timeout-"));
    tempDirs.push(tempDir);
    const paths = createLocalDataPaths(tempDir);
    const fetchFn = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
    });
    const storage = createVideoStorage({
      paths,
      fetchFn: fetchFn as unknown as typeof fetch,
      downloadTimeoutMs: 10,
    });
    const batch = createVideoBatchRecord({
      id: "video_batch_timeout",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      shotCount: 1,
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
    });
    const segment = createSegmentVideoRecord({
      id: "video_shot_timeout",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      segmentId: "segment_1",
      sceneId: "scene_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_frame_only",
      durationSec: 3,
      status: "in_review",
      updatedAt: "2026-03-25T00:05:00.000Z",
      sourceTaskId: "task_segment_timeout",
    });

    const writePromise = storage.writeCurrentVideo({
      segment,
      videoSourceUrl: "https://cdn.example/hung-output.mp4",
      thumbnailSourceUrl: null,
      metadata: {
        provider: "vector-engine",
      },
    });
    await expect(writePromise).rejects.toThrow("Video asset download timed out");
  });

  it("writes video prompt planning metadata beside the shot assets", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-video-plan-"));
    tempDirs.push(tempDir);
    const paths = createLocalDataPaths(tempDir);
    const storage = createVideoStorage({ paths });
    const segment = createSegmentVideoRecord({
      id: "video_shot_plan",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      segmentId: "segment_1",
      sceneId: "scene_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_and_end_frame",
      durationSec: 5,
      status: "generating",
      updatedAt: "2026-03-27T00:05:00.000Z",
      sourceTaskId: "task_segment_plan",
    });

    await storage.writePromptPlan({
      segment,
      planning: {
        finalPrompt: "以<<<image_1>>>为首帧锚点，让林缓慢抬头并继续前进。",
        dialoguePlan: "说话主体：林；台词：有人先到了。",
        audioPlan: "雨声、摊布拍打声、远处人群底噪。",
        visualGuardrails: "保持外观、服装与空间连续；自然衔接尾帧。",
        rationale: "把对白和环境声并入 Kling Omni 单镜头提示词。",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      },
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "videos",
          "batches",
          "video_batch_1",
          "shots",
          "scene_1__segment_1__shot_1",
          "prompt.plan.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"dialoguePlan": "说话主体：林；台词：有人先到了。"');
  });
});
