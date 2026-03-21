import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

  it("writes the current storyboard JSON and markdown inside the project", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-storyboards-"));
    tempDirs.push(tempDir);

    const storage = createStoryboardStorage({
      paths: createLocalDataPaths(tempDir),
    });

    await storage.writeCurrentStoryboard({
      storageDir: "projects/proj_20260321_ab12cd-my-story",
      storyboard: {
        id: "storyboard_20260321_ab12cd",
        title: "The Last Sky Choir",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        sourceTaskId: "task_20260321_storyboard",
        updatedAt: "2026-03-21T12:30:00.000Z",
        approvedAt: null,
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "Rin Hears The Sky",
            dramaticPurpose: "Trigger the inciting beat.",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 6,
                visual: "Rain shakes across the cockpit glass.",
                characterAction: "Rin looks up.",
                dialogue: "",
                voiceOver: "That sound again.",
                audio: "",
                purpose: "Start the mystery.",
              },
            ],
          },
        ],
      },
    });

    await expect(
      storage.readCurrentStoryboard({
        storageDir: "projects/proj_20260321_ab12cd-my-story",
      }),
    ).resolves.toEqual({
      id: "storyboard_20260321_ab12cd",
      title: "The Last Sky Choir",
      episodeTitle: "Episode 1",
      sourceMasterPlotId: "mp_20260321_ab12cd",
      sourceTaskId: "task_20260321_storyboard",
      updatedAt: "2026-03-21T12:30:00.000Z",
      approvedAt: null,
      scenes: [
        {
          id: "scene_1",
          order: 1,
          name: "Rin Hears The Sky",
          dramaticPurpose: "Trigger the inciting beat.",
          segments: [
            {
              id: "segment_1",
              order: 1,
              durationSec: 6,
              visual: "Rain shakes across the cockpit glass.",
              characterAction: "Rin looks up.",
              dialogue: "",
              voiceOver: "That sound again.",
              audio: "",
              purpose: "Start the mystery.",
            },
          ],
        },
      ],
    });
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260321_ab12cd-my-story",
          "storyboard",
          "current.md",
        ),
        "utf8",
      ),
    ).resolves.toContain("Rin Hears The Sky");
  });

  it("initializes a storyboard prompt by copying the global template file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-storyboards-"));
    tempDirs.push(tempDir);
    const globalPromptPath = path.join(tempDir, "prompt-templates", "storyboard.generate.txt");
    const storage = createStoryboardStorage({
      paths: createLocalDataPaths(tempDir),
    });

    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(
      globalPromptPath,
      "Global prompt from file:\n{{masterPlot.logline}}\nKeep the beats visual.",
      "utf8",
    );

    await storage.initializePromptTemplate({
      storageDir: "projects/proj_20260321_ab12cd-my-story",
      promptTemplateKey: "storyboard.generate",
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260321_ab12cd-my-story",
          "prompts",
          "storyboard",
          "project",
          "active.template.txt",
        ),
        "utf8",
      ),
    ).resolves.toBe("Global prompt from file:\n{{masterPlot.logline}}\nKeep the beats visual.");
  });

  it("reads the project storyboard prompt when present", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-storyboards-"));
    tempDirs.push(tempDir);
    const storage = createStoryboardStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const projectPromptPath = path.join(
      tempDir,
      ".local-data",
      "projects",
      "proj_20260321_ab12cd-my-story",
      "prompts",
      "storyboard",
      "project",
      "active.template.txt",
    );
    const globalPromptPath = path.join(tempDir, "prompt-templates", "storyboard.generate.txt");

    await fs.mkdir(path.dirname(projectPromptPath), { recursive: true });
    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(globalPromptPath, "global prompt", "utf8");
    await fs.writeFile(projectPromptPath, "project prompt", "utf8");

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        promptTemplateKey: "storyboard.generate",
      }),
    ).resolves.toBe("project prompt");
  });

  it("falls back to the global storyboard prompt when the project prompt is missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-storyboards-"));
    tempDirs.push(tempDir);
    const storage = createStoryboardStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const globalPromptPath = path.join(tempDir, "prompt-templates", "storyboard.generate.txt");

    await fs.mkdir(path.dirname(globalPromptPath), { recursive: true });
    await fs.writeFile(globalPromptPath, "global fallback prompt", "utf8");

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        promptTemplateKey: "storyboard.generate",
      }),
    ).resolves.toBe("global fallback prompt");
  });

  it("throws a clear error when neither storyboard prompt file exists", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-storyboards-"));
    tempDirs.push(tempDir);
    const storage = createStoryboardStorage({
      paths: createLocalDataPaths(tempDir),
    });

    await expect(
      storage.readPromptTemplate({
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        promptTemplateKey: "storyboard.generate",
      }),
    ).rejects.toThrow("Prompt template not found: storyboard.generate");
  });
});
