import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createTaskFileStorage } from "../src/index";

describe("task file storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("creates storyboard task input artifacts inside the owning project", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-task-files-"));
    tempDirs.push(tempDir);

    const storage = createTaskFileStorage({
      paths: createLocalDataPaths(tempDir),
    });

    await storage.createTaskArtifacts({
      task: {
        id: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        type: "storyboard_generate",
        status: "pending",
        queueName: "storyboard-generate",
        storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
        inputRelPath: "tasks/task_20260321_storyboard/input.json",
        outputRelPath: "tasks/task_20260321_storyboard/output.json",
        logRelPath: "tasks/task_20260321_storyboard/log.txt",
        errorMessage: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        startedAt: null,
        finishedAt: null,
      },
      input: {
        taskId: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        taskType: "storyboard_generate",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        masterPlot: {
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
        },
        promptTemplateKey: "storyboard.generate",
        model: "gemini-3.1-pro-preview",
      },
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260321_ab12cd-my-story",
          "tasks",
          "task_20260321_storyboard",
          "input.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"taskType\": \"storyboard_generate\"");
    await expect(
      storage.readTaskInput({
        task: {
          id: "task_20260321_storyboard",
          projectId: "proj_20260321_ab12cd",
          type: "storyboard_generate",
          status: "pending",
          queueName: "storyboard-generate",
          storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
          inputRelPath: "tasks/task_20260321_storyboard/input.json",
          outputRelPath: "tasks/task_20260321_storyboard/output.json",
          logRelPath: "tasks/task_20260321_storyboard/log.txt",
          errorMessage: null,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        },
      }),
    ).resolves.toEqual({
      taskId: "task_20260321_storyboard",
      projectId: "proj_20260321_ab12cd",
      taskType: "storyboard_generate",
      sourceMasterPlotId: "mp_20260321_ab12cd",
      masterPlot: {
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis:
          "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict:
          "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
      },
      promptTemplateKey: "storyboard.generate",
      model: "gemini-3.1-pro-preview",
    });
  });

  it("writes the task output and appends to the task log", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-task-files-"));
    tempDirs.push(tempDir);

    const storage = createTaskFileStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const task = {
      id: "task_20260321_storyboard",
      projectId: "proj_20260321_ab12cd",
      type: "storyboard_generate" as const,
      status: "pending" as const,
      queueName: "storyboard-generate",
      storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
      inputRelPath: "tasks/task_20260321_storyboard/input.json",
      outputRelPath: "tasks/task_20260321_storyboard/output.json",
      logRelPath: "tasks/task_20260321_storyboard/log.txt",
      errorMessage: null,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
      startedAt: null,
      finishedAt: null,
    };

    await storage.createTaskArtifacts({
      task,
      input: {
        taskId: task.id,
        projectId: task.projectId,
        taskType: "storyboard_generate",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        masterPlot: {
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
        },
        promptTemplateKey: "storyboard.generate",
        model: "gemini-3.1-pro-preview",
      },
    });
    await storage.writeTaskOutput({
      task,
      output: {
        storyboardId: "storyboard_20260321_ab12cd",
        sceneCount: 2,
        segmentCount: 5,
        totalDurationSec: 31,
      },
    });
    await storage.appendTaskLog({
      task,
      message: "worker started",
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260321_ab12cd-my-story",
          "tasks",
          "task_20260321_storyboard",
          "output.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"storyboardId\": \"storyboard_20260321_ab12cd\"");
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260321_ab12cd-my-story",
          "tasks",
          "task_20260321_storyboard",
          "log.txt",
        ),
        "utf8",
      ),
    ).resolves.toContain("worker started");
  });
});
