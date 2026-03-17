import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectRecord, createStoryboardVersionRecord } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardVersionRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite storyboard version repository", () => {
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

  it("initializes the storyboard_versions table schema", async () => {
    const { db } = await createRepositoryContext();

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'storyboard_versions'",
      )
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("storyboard_versions");
  });

  it("inserts version metadata and finds the current version by project id", async () => {
    const { projectRepository, storyboardVersionRepository } =
      await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      scriptBytes: 7,
    });
    const version = createStoryboardVersionRecord({
      id: "sbv_20260317_ab12cd",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceTaskId: "task_20260317_ab12cd",
      versionNumber: 1,
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      createdAt: "2026-03-17T12:00:00.000Z",
    });

    projectRepository.insert(project);
    storyboardVersionRepository.insert(version);
    projectRepository.updateCurrentStoryboardVersion({
      projectId: project.id,
      storyboardVersionId: version.id,
    });

    expect(
      storyboardVersionRepository.findCurrentByProjectId(project.id),
    ).toEqual(version);
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    db,
    projectRepository: createSqliteProjectRepository({ db }),
    storyboardVersionRepository: createSqliteStoryboardVersionRepository({ db }),
  };
}
