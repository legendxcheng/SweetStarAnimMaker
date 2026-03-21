import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectRecord, premiseRelPath } from "@sweet-star/core";
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
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'")
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("projects");
    const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain("current_master_plot_id");
    expect(columns.map((column) => column.name)).toContain("current_character_sheet_batch_id");
    expect(columns.map((column) => column.name)).toContain("current_storyboard_id");
  });

  it("inserts and finds a project by id", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
    });

    repository.insert(project);

    expect(repository.findById("proj_20260321_ab12cd")).toEqual(project);
  });

  it("updates premise metadata fields", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
    });

    repository.insert(project);
    repository.updatePremiseMetadata({
      id: "proj_20260321_ab12cd",
      premiseBytes: 15,
      updatedAt: "2026-03-21T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T01:00:00.000Z",
    });

    expect(repository.findById("proj_20260321_ab12cd")).toEqual({
      ...project,
      premiseBytes: 15,
      updatedAt: "2026-03-21T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T01:00:00.000Z",
    });
  });

  it("updates the current master plot and storyboard pointers on the project row", async () => {
    const { db, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
    });

    repository.insert(project);
    repository.updateCurrentMasterPlot({
      projectId: "proj_20260321_ab12cd",
      masterPlotId: "mp_20260321_ab12cd",
    });
    repository.updateCurrentCharacterSheetBatch({
      projectId: "proj_20260321_ab12cd",
      batchId: "char_batch_v1",
    });
    repository.updateCurrentStoryboard({
      projectId: "proj_20260321_ab12cd",
      storyboardId: "storyboard_20260321_ab12cd",
    });

    const row = db
      .prepare(
        "SELECT current_master_plot_id, current_character_sheet_batch_id, current_storyboard_id FROM projects WHERE id = ?",
      )
      .get("proj_20260321_ab12cd") as
      | {
          current_master_plot_id: string | null;
          current_character_sheet_batch_id: string | null;
          current_storyboard_id: string | null;
        }
      | undefined;

    expect(row).toEqual({
      current_master_plot_id: "mp_20260321_ab12cd",
      current_character_sheet_batch_id: "char_batch_v1",
      current_storyboard_id: "storyboard_20260321_ab12cd",
    });
  });

  it("updates the persisted project status", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
    });

    repository.insert(project);
    repository.updateStatus({
      projectId: project.id,
      status: "storyboard_in_review",
      updatedAt: "2026-03-21T01:00:00.000Z",
    });

    expect(repository.findById(project.id)).toEqual({
      ...project,
      status: "storyboard_in_review",
      updatedAt: "2026-03-21T01:00:00.000Z",
    });
  });

  it("inserts a project into a legacy schema that still requires script columns", async () => {
    const { db } = await createRepositoryContext({
      legacyProjectsTable: true,
    });
    const repository = createSqliteProjectRepository({ db });
    const project = createProjectRecord({
      id: "proj_20260321_legacy",
      name: "Legacy Insert",
      slug: "legacy-insert",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 55,
    });

    expect(() => repository.insert(project)).not.toThrow();

    const row = db
      .prepare(
        `
          SELECT script_rel_path, script_bytes, script_updated_at
          FROM projects
          WHERE id = ?
        `,
      )
      .get(project.id) as
      | {
          script_rel_path: string;
          script_bytes: number;
          script_updated_at: string;
        }
      | undefined;

    expect(row).toEqual({
      script_rel_path: premiseRelPath,
      script_bytes: project.premiseBytes,
      script_updated_at: project.premiseUpdatedAt,
    });
  });
});

async function createRepositoryContext(options: { legacyProjectsTable?: boolean } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);

  if (options.legacyProjectsTable) {
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        storage_dir TEXT NOT NULL,
        script_rel_path TEXT NOT NULL,
        script_bytes INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        script_updated_at TEXT NOT NULL
      )
    `);
  }

  initializeSqliteSchema(db);

  return {
    db,
    repository: createSqliteProjectRepository({ db }),
  };
}
