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
      shots: [
        {
          id: "shot_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          order: 1,
          shotCode: "S01-SG01",
          shotPurpose: "Establish the flooded market and Rin's hesitation.",
          subjectCharacters: ["Rin"],
          environment: "Flooded dawn market",
          framing: "medium wide shot",
          cameraAngle: "eye level",
          composition: "Rin framed by hanging lanterns",
          actionMoment: "Rin pauses at the waterline",
          emotionTone: "uneasy anticipation",
          continuityNotes: "Keep soaked satchel on left shoulder",
          imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
          negativePrompt: null,
          motionHint: null,
          durationSec: 4,
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
    ).resolves.toContain("S01-SG01");
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
    ).resolves.toContain("Flooded dawn market");
  });

  it("initializes and reads shot script prompt templates using project override first", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-scripts-"));
    tempDirs.push(tempDir);

    const storage = createShotScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const globalPromptPath = path.join(tempDir, "prompt-templates", "shot_script.generate.txt");

    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(
      globalPromptPath,
      "Global shot script prompt\n{{storyboard.title}}\n{{storyboard.scenes.0.segments.0.visual}}",
      "utf8",
    );

    await storage.initializePromptTemplate({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      promptTemplateKey: "shot_script.generate",
    });

    const projectPromptPath = path.join(
      tempDir,
      ".local-data",
      "projects",
      "proj_20260322_ab12cd-my-story",
      "prompt-templates",
      "shot_script.generate.txt",
    );

    await expect(fs.readFile(projectPromptPath, "utf8")).resolves.toContain("{{storyboard.title}}");

    await fs.writeFile(projectPromptPath, "Project shot script prompt", "utf8");

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        promptTemplateKey: "shot_script.generate",
      }),
    ).resolves.toBe("Project shot script prompt");
  });

  it("falls back to the global shot script prompt when the project override is missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-scripts-"));
    tempDirs.push(tempDir);

    const storage = createShotScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const globalPromptPath = path.join(tempDir, "prompt-templates", "shot_script.generate.txt");

    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(globalPromptPath, "global shot script prompt", "utf8");

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        promptTemplateKey: "shot_script.generate",
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
        promptTemplateKey: "shot_script.generate",
      }),
    ).rejects.toThrow("Prompt template not found: shot_script.generate");
  });
});
