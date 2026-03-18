import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectRecord } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite project repository", () => {
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

  it("initializes the projects table schema", async () => {
    const { db } = await createRepositoryContext();

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
      )
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("projects");
    const columns = db
      .prepare("PRAGMA table_info(projects)")
      .all() as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain(
      "current_storyboard_version_id",
    );
  });

  it("inserts and finds a project by id", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      scriptBytes: 7,
    });

    repository.insert(project);

    expect(repository.findById("proj_20260317_ab12cd")).toEqual(project);
  });

  it("updates script metadata fields", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      scriptBytes: 7,
    });

    repository.insert(project);
    repository.updateScriptMetadata({
      id: "proj_20260317_ab12cd",
      scriptBytes: 15,
      updatedAt: "2026-03-17T01:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T01:00:00.000Z",
    });

    expect(repository.findById("proj_20260317_ab12cd")).toEqual({
      ...project,
      scriptBytes: 15,
      updatedAt: "2026-03-17T01:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T01:00:00.000Z",
    });
  });

  it("updates the current storyboard version pointer on the project row", async () => {
    const { db, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      scriptBytes: 7,
    });

    repository.insert(project);
    repository.updateCurrentStoryboardVersion({
      projectId: "proj_20260317_ab12cd",
      storyboardVersionId: "sbv_20260317_ab12cd",
    });

    const row = db
      .prepare("SELECT current_storyboard_version_id FROM projects WHERE id = ?")
      .get("proj_20260317_ab12cd") as
      | { current_storyboard_version_id: string | null }
      | undefined;

    expect(row?.current_storyboard_version_id).toBe("sbv_20260317_ab12cd");
  });

  it("updates the persisted project status", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      scriptBytes: 7,
    });

    repository.insert(project);
    repository.updateStatus({
      projectId: project.id,
      status: "storyboard_in_review",
      updatedAt: "2026-03-17T01:00:00.000Z",
    });

    expect(repository.findById(project.id)).toEqual({
      ...project,
      status: "storyboard_in_review",
      updatedAt: "2026-03-17T01:00:00.000Z",
    });
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
    repository: createSqliteProjectRepository({ db }),
  };
}
