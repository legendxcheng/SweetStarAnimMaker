import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";

describe("tasks api", () => {
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("creates a storyboard task for an existing project", async () => {
    const enqueue = vi.fn();
    const app = await createTempApp({
      taskQueue: { enqueue },
    });

    const createProjectResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "My Story", script: "Scene 1" },
    });
    const project = createProjectResponse.json();

    const taskResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });

    expect(taskResponse.statusCode).toBe(201);
    expect(taskResponse.json()).toEqual({
      id: "task_20260317_ab12cd",
      projectId: project.id,
      type: "storyboard_generate",
      status: "pending",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260317_ab12cd/input.json",
        outputPath: "tasks/task_20260317_ab12cd/output.json",
        logPath: "tasks/task_20260317_ab12cd/log.txt",
      },
    });
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      queueName: "storyboard-generate",
      taskType: "storyboard_generate",
    });
  });

  it("gets an existing task by id", async () => {
    const app = await createTempApp({
      taskQueue: { enqueue: vi.fn() },
    });
    const createProjectResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "My Story", script: "Scene 1" },
    });
    const project = createProjectResponse.json();

    await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });
    const detailResponse = await app.inject({
      method: "GET",
      url: "/tasks/task_20260317_ab12cd",
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual(
      expect.objectContaining({
        id: "task_20260317_ab12cd",
        projectId: project.id,
        status: "pending",
      }),
    );
  });

  it("returns 404 when creating a task for a missing project", async () => {
    const app = await createTempApp({
      taskQueue: { enqueue: vi.fn() },
    });

    const response = await app.inject({
      method: "POST",
      url: "/projects/missing-project/tasks/storyboard-generate",
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 for a missing task", async () => {
    const app = await createTempApp({
      taskQueue: { enqueue: vi.fn() },
    });

    const response = await app.inject({
      method: "GET",
      url: "/tasks/missing-task",
    });

    expect(response.statusCode).toBe(404);
  });

  async function createTempApp(options: { taskQueue: { enqueue: ReturnType<typeof vi.fn> } }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-task-api-"));
    tempDirs.push(tempDir);

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: options.taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
    });
    apps.push(app);
    await app.ready();

    return app;
  }
});
