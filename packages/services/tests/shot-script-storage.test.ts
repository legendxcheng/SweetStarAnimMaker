import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { CurrentShotScript } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createShotScriptStorage } from "../src/index";

describe("shot script storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("writes current and versioned shot script artifacts inside the project", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-scripts-"));
    tempDirs.push(tempDir);

    const storage = createShotScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const shotScript: CurrentShotScript = {
      id: "shot_script_20260322_ab12cd",
      title: "Episode 1 Shot Script",
      sourceStoryboardId: "storyboard_20260322_ab12cd",
      sourceTaskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:30:00.000Z",
      approvedAt: null,
      segmentCount: 1,
      shotCount: 2,
      totalDurationSec: 4,
      segments: [
        {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          name: "雨市相遇",
          summary: "林在积水市场边停下，看到熟悉身影。",
          durationSec: 4,
          status: "in_review",
          lastGeneratedAt: "2026-03-22T12:30:00.000Z",
          approvedAt: null,
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "SC01-SG01-SH01",
              durationSec: 2,
              purpose: "建立雨市空间和主角位置。",
              visual: "清晨积水市场，林站在灯笼下。",
              subject: "林",
              action: "停在水边，观察前方人群。",
              frameDependency: "start_frame_only",
              dialogue: null,
              os: null,
              audio: "雨声、远处叫卖声。",
              transitionHint: "切近景",
              continuityNotes: "书包保持在左肩。",
            },
            {
              id: "shot_2",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 2,
              shotCode: "SC01-SG01-SH02",
              durationSec: 2,
              purpose: "推进林的情绪反应。",
              visual: "林看见熟悉背影，神情一滞。",
              subject: "林",
              action: "抬头，目光定住。",
              frameDependency: "start_frame_only",
              dialogue: "是她？",
              os: null,
              audio: "环境声压低，心跳声轻起。",
              transitionHint: null,
              continuityNotes: "延续前镜头站位和朝向。",
            },
          ],
        },
      ],
    };

    await storage.writeCurrentShotScript({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      shotScript,
    });
    await storage.writeShotScriptVersion({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      versionId: "v1-ai",
      kind: "ai",
      shotScript,
    });

    await expect(
      storage.readCurrentShotScript({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
      }),
    ).resolves.toEqual(shotScript);
    await expect(
      storage.readShotScriptVersion({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        versionId: "v1-ai",
      }),
    ).resolves.toEqual(shotScript);
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260322_ab12cd-my-story",
          "shot-script",
          "current.md",
        ),
        "utf8",
      ),
    ).resolves.toContain("SC01-SG01-SH01");
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260322_ab12cd-my-story",
          "shot-script",
          "versions",
          "v1-ai.md",
        ),
        "utf8",
      ),
    ).resolves.toContain("雨市相遇");
  });

  it("initializes and reads shot script prompt templates using project override first", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-scripts-"));
    tempDirs.push(tempDir);

    const storage = createShotScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const globalPromptPath = path.join(
      tempDir,
      "prompt-templates",
      "shot_script.segment.generate.txt",
    );

    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(
      globalPromptPath,
      "Global shot script prompt\n{{storyboardTitle}}\n{{segment.visual}}",
      "utf8",
    );

    await storage.initializePromptTemplate({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      promptTemplateKey: "shot_script.segment.generate",
    });

    const projectPromptPath = path.join(
      tempDir,
      ".local-data",
      "projects",
      "proj_20260322_ab12cd-my-story",
      "prompt-templates",
      "shot_script.segment.generate.txt",
    );

    await expect(fs.readFile(projectPromptPath, "utf8")).resolves.toContain("{{storyboardTitle}}");

    await fs.writeFile(projectPromptPath, "Project shot script prompt", "utf8");

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        promptTemplateKey: "shot_script.segment.generate",
      }),
    ).resolves.toBe("Project shot script prompt");
  });

  it("falls back to the global shot script prompt when the project override is missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-scripts-"));
    tempDirs.push(tempDir);

    const storage = createShotScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const globalPromptPath = path.join(
      tempDir,
      "prompt-templates",
      "shot_script.segment.generate.txt",
    );

    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(globalPromptPath, "global shot script prompt", "utf8");

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        promptTemplateKey: "shot_script.segment.generate",
      }),
    ).resolves.toBe("global shot script prompt");
  });

  it("throws a clear error when no shot script prompt template exists", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-scripts-"));
    tempDirs.push(tempDir);

    const storage = createShotScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        promptTemplateKey: "shot_script.segment.generate",
      }),
    ).rejects.toThrow("Prompt template not found: shot_script.segment.generate");
  });
});
