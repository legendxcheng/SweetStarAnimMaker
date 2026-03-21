import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createTaskRecord } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteTaskRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite task repository", () => {
  afterEach(async () => {
    for (const db of dbs) {
      db.close();
    }

    dbs.length = 0;
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("initializes the tasks table schema", async () => {
    const { db } = await createRepositoryContext();

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("tasks");
  });

  it("inserts and finds a storyboard task by id", async () => {
    const { repository } = await createRepositoryContext();
    const task = createTaskRecord({
      id: "task_20260321_storyboard",
      projectId: "proj_20260321_ab12cd",
      projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
      type: "storyboard_generate",
      queueName: "storyboard-generate",
      createdAt: "2026-03-21T12:00:00.000Z",
    });

    repository.insert(task);

    expect(repository.findById("task_20260321_storyboard")).toEqual(task);
  });

  it("updates status transitions and error metadata", async () => {
    const { repository } = await createRepositoryContext();
    const task = createTaskRecord({
      id: "task_20260321_storyboard",
      projectId: "proj_20260321_ab12cd",
      projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
      type: "storyboard_generate",
      queueName: "storyboard-generate",
      createdAt: "2026-03-21T12:00:00.000Z",
    });

    repository.insert(task);
    repository.markRunning({
      taskId: task.id,
      updatedAt: "2026-03-21T12:01:00.000Z",
      startedAt: "2026-03-21T12:01:00.000Z",
    });

    expect(repository.findById(task.id)).toEqual({
      ...task,
      status: "running",
      updatedAt: "2026-03-21T12:01:00.000Z",
      startedAt: "2026-03-21T12:01:00.000Z",
    });

    repository.markFailed({
      taskId: task.id,
      errorMessage: "boom",
      updatedAt: "2026-03-21T12:02:00.000Z",
      finishedAt: "2026-03-21T12:02:00.000Z",
    });

    expect(repository.findById(task.id)).toEqual({
      ...task,
      status: "failed",
      updatedAt: "2026-03-21T12:02:00.000Z",
      startedAt: "2026-03-21T12:01:00.000Z",
      finishedAt: "2026-03-21T12:02:00.000Z",
      errorMessage: "boom",
    });
  });

  it("finds the latest storyboard generate task for a project", async () => {
    const { repository } = await createRepositoryContext();

    repository.insert(
      createTaskRecord({
        id: "task_20260321_old",
        projectId: "proj_20260321_ab12cd",
        projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
        type: "storyboard_generate",
        queueName: "storyboard-generate",
        createdAt: "2026-03-21T12:00:00.000Z",
      }),
    );
    repository.insert(
      createTaskRecord({
        id: "task_20260321_new",
        projectId: "proj_20260321_ab12cd",
        projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
        type: "storyboard_generate",
        queueName: "storyboard-generate",
        createdAt: "2026-03-21T12:05:00.000Z",
      }),
    );

    expect(
      repository.findLatestByProjectId("proj_20260321_ab12cd", "storyboard_generate"),
    ).toEqual(
      expect.objectContaining({
        id: "task_20260321_new",
      }),
    );
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-task-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    db,
    repository: createSqliteTaskRepository({ db }),
  };
}
