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

  it("creates task input artifacts inside the owning project", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-task-files-"));
    tempDirs.push(tempDir);

    const storage = createTaskFileStorage({
      paths: createLocalDataPaths(tempDir),
    });

    await storage.createTaskArtifacts({
      task: {
        id: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        type: "master_plot_generate",
        status: "pending",
        queueName: "master-plot-generate",
        storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
        inputRelPath: "tasks/task_20260317_ab12cd/input.json",
        outputRelPath: "tasks/task_20260317_ab12cd/output.json",
        logRelPath: "tasks/task_20260317_ab12cd/log.txt",
        errorMessage: null,
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        startedAt: null,
        finishedAt: null,
      },
      input: {
        taskId: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      },
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260317_ab12cd-my-story",
          "tasks",
          "task_20260317_ab12cd",
          "input.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"taskType\": \"master_plot_generate\"");
    await expect(
      storage.readTaskInput({
        task: {
          id: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          type: "master_plot_generate",
          status: "pending",
          queueName: "master-plot-generate",
          storageDir:
            "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
          inputRelPath: "tasks/task_20260317_ab12cd/input.json",
          outputRelPath: "tasks/task_20260317_ab12cd/output.json",
          logRelPath: "tasks/task_20260317_ab12cd/log.txt",
          errorMessage: null,
          createdAt: "2026-03-17T12:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        },
      }),
    ).resolves.toEqual({
      taskId: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      taskType: "master_plot_generate",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptTemplateKey: "master_plot.generate",
    });
  });

  it("writes the task output and appends to the task log", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-task-files-"));
    tempDirs.push(tempDir);

    const storage = createTaskFileStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const task = {
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "master_plot_generate" as const,
      status: "pending" as const,
      queueName: "master-plot-generate",
      storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
      inputRelPath: "tasks/task_20260317_ab12cd/input.json",
      outputRelPath: "tasks/task_20260317_ab12cd/output.json",
      logRelPath: "tasks/task_20260317_ab12cd/log.txt",
      errorMessage: null,
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      startedAt: null,
      finishedAt: null,
    };

    await storage.createTaskArtifacts({
      task,
      input: {
        taskId: task.id,
        projectId: task.projectId,
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      },
    });
    await storage.writeTaskOutput({
      task,
      output: {
        storyboardId: "story_20260317_ab12cd",
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
          "proj_20260317_ab12cd-my-story",
          "tasks",
          "task_20260317_ab12cd",
          "output.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"storyboardId\": \"story_20260317_ab12cd\"");
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260317_ab12cd-my-story",
          "tasks",
          "task_20260317_ab12cd",
          "log.txt",
        ),
        "utf8",
      ),
    ).resolves.toContain("worker started");
  });
});
