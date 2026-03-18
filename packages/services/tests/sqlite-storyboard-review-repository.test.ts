import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createStoryboardReviewRecord,
  createStoryboardVersionRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardReviewRepository,
  createSqliteStoryboardVersionRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite storyboard review repository", () => {
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

  it("initializes the storyboard_reviews table schema", async () => {
    const { db } = await createRepositoryContext();

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'storyboard_reviews'",
      )
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("storyboard_reviews");
  });

  it("inserts reviews and finds the latest review by project id", async () => {
    const { projectRepository, storyboardVersionRepository, repository } =
      await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260318_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-18T10:00:00.000Z",
      updatedAt: "2026-03-18T10:00:00.000Z",
      scriptUpdatedAt: "2026-03-18T10:00:00.000Z",
      scriptBytes: 120,
    });

    projectRepository.insert(project);
    storyboardVersionRepository.insert(
      createStoryboardVersionRecord({
        id: "sbv_20260318_v1",
        projectId: project.id,
        projectStorageDir: project.storageDir,
        sourceTaskId: "task_20260318_v1",
        versionNumber: 1,
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        createdAt: "2026-03-18T12:00:00.000Z",
      }),
    );
    storyboardVersionRepository.insert(
      createStoryboardVersionRecord({
        id: "sbv_20260318_v2",
        projectId: project.id,
        projectStorageDir: project.storageDir,
        sourceTaskId: "task_20260318_v2",
        versionNumber: 2,
        provider: "manual",
        model: "manual-edit",
        kind: "human",
        createdAt: "2026-03-18T12:10:00.000Z",
      }),
    );

    repository.insert(
      createStoryboardReviewRecord({
        id: "sbr_20260318_old",
        projectId: "proj_20260318_ab12cd",
        storyboardVersionId: "sbv_20260318_v1",
        action: "reject",
        reason: "Need better pacing.",
        createdAt: "2026-03-18T12:00:00.000Z",
      }),
    );
    repository.insert(
      createStoryboardReviewRecord({
        id: "sbr_20260318_new",
        projectId: "proj_20260318_ab12cd",
        storyboardVersionId: "sbv_20260318_v2",
        action: "approve",
        note: "Ready to ship.",
        createdAt: "2026-03-18T12:10:00.000Z",
      }),
    );

    expect(repository.findLatestByProjectId("proj_20260318_ab12cd")).toEqual({
      id: "sbr_20260318_new",
      projectId: "proj_20260318_ab12cd",
      storyboardVersionId: "sbv_20260318_v2",
      action: "approve",
      reason: "Ready to ship.",
      triggeredTaskId: null,
      createdAt: "2026-03-18T12:10:00.000Z",
    });
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-review-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    db,
    projectRepository: createSqliteProjectRepository({ db }),
    storyboardVersionRepository: createSqliteStoryboardVersionRepository({ db }),
    repository: createSqliteStoryboardReviewRepository({ db }),
  };
}
