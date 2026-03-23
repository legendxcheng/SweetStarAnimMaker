import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectRecord, createShotScriptReviewRecord, createTaskRecord } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotScriptReviewRepository,
  createSqliteTaskRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite shot script review repository", () => {
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

  it("initializes the shot_script_reviews table schema", async () => {
    const { db } = await createRepositoryContext();

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'shot_script_reviews'",
      )
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("shot_script_reviews");
  });

  it("inserts reviews and finds the latest review by project id", async () => {
    const { projectRepository, taskRepository, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260322_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-22T10:00:00.000Z",
      updatedAt: "2026-03-22T10:00:00.000Z",
      premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
      premiseBytes: 120,
    });

    projectRepository.insert(project);
    taskRepository.insert(
      createTaskRecord({
        id: "task_20260322_shot_script",
        projectId: project.id,
        projectStorageDir: project.storageDir,
        type: "shot_script_generate",
        queueName: "shot-script-generate",
        createdAt: "2026-03-22T12:05:00.000Z",
      }),
    );
    repository.insert(
      createShotScriptReviewRecord({
        id: "ssr_20260322_old",
        projectId: project.id,
        shotScriptId: "shot_script_v1",
        action: "reject",
        reason: "Need tighter continuity.",
        nextAction: "edit_manually",
        createdAt: "2026-03-22T12:00:00.000Z",
      }),
    );
    repository.insert(
      createShotScriptReviewRecord({
        id: "ssr_20260322_new",
        projectId: project.id,
        shotScriptId: "shot_script_v2",
        action: "approve",
        reason: null,
        nextAction: null,
        triggeredTaskId: "task_20260322_shot_script",
        createdAt: "2026-03-22T12:10:00.000Z",
      }),
    );

    expect(repository.findLatestByProjectId(project.id)).toEqual({
      id: "ssr_20260322_new",
      projectId: project.id,
      shotScriptId: "shot_script_v2",
      action: "approve",
      reason: null,
      nextAction: null,
      triggeredTaskId: "task_20260322_shot_script",
      createdAt: "2026-03-22T12:10:00.000Z",
    });
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-review-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    db,
    projectRepository: createSqliteProjectRepository({ db }),
    taskRepository: createSqliteTaskRepository({ db }),
    repository: createSqliteShotScriptReviewRepository({ db }),
  };
}
