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

  it("writes current batch manifest, current video assets, and versioned assets inside the segment directory", async () => {
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
      segmentCount: 1,
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
    });
    const segment = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
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
    ).resolves.toContain('"segmentCount": 1');
    await expect(
      fs.readFile(
        path.join(tempDir, ".local-data", "projects", "proj_1-my-story", "videos", "batches", "video_batch_1", "segments", "scene_1__segment_1", "current.json"),
        "utf8",
      ),
    ).resolves.toContain('"provider": "vector-engine"');
    await expect(
      fs.readFile(
        path.join(tempDir, ".local-data", "projects", "proj_1-my-story", "videos", "batches", "video_batch_1", "segments", "scene_1__segment_1", "versions", "task_segment_1.json"),
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
      segmentCount: 1,
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
    });
    const segment = createSegmentVideoRecord({
      id: "video_segment_timeout",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
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
});
