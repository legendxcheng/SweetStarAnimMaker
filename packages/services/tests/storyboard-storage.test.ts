import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createStoryboardVersionRecord } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createStoryboardStorage } from "../src/index";

describe("storyboard storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("writes the raw response and storyboard version inside the project", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-storyboards-"));
    tempDirs.push(tempDir);

    const storage = createStoryboardStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const version = createStoryboardVersionRecord({
      id: "sbv_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
      sourceTaskId: "task_20260317_ab12cd",
      versionNumber: 1,
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      createdAt: "2026-03-17T12:00:00.000Z",
    });

    await storage.writeRawResponse({
      version,
      rawResponse: {
        candidates: [{ content: { parts: [{ text: "..." }] } }],
      },
    });
    await storage.writeStoryboardVersion({
      version,
      storyboard: {
        summary: "A short story summary",
        scenes: [
          {
            id: "scene_1",
            sceneIndex: 1,
            description: "A enters the room",
            camera: "medium shot",
            characters: ["A"],
            prompt: "medium shot, character A entering a dim room",
          },
        ],
      },
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260317_ab12cd-my-story",
          "storyboards",
          "raw",
          "task_20260317_ab12cd-gemini-response.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"candidates\"");
    await expect(
      storage.readStoryboardVersion({
        version,
      }),
    ).resolves.toEqual({
      summary: "A short story summary",
      scenes: [
        {
          id: "scene_1",
          sceneIndex: 1,
          description: "A enters the room",
          camera: "medium shot",
          characters: ["A"],
          prompt: "medium shot, character A entering a dim room",
        },
      ],
    });
  });
});
