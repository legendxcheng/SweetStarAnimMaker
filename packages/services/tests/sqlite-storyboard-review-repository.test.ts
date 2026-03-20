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
      premiseUpdatedAt: "2026-03-18T10:00:00.000Z",
      premiseBytes: 120,
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
        masterPlotId: "mp_20260318_v1",
        action: "reject",
        reason: "Need better pacing.",
        createdAt: "2026-03-18T12:00:00.000Z",
      }),
    );
    repository.insert(
      createStoryboardReviewRecord({
        id: "sbr_20260318_new",
        projectId: "proj_20260318_ab12cd",
        masterPlotId: "mp_20260318_v2",
        action: "approve",
        note: "Ready to ship.",
        createdAt: "2026-03-18T12:10:00.000Z",
      }),
    );

    expect(repository.findLatestByProjectId("proj_20260318_ab12cd")).toEqual({
      id: "sbr_20260318_new",
      projectId: "proj_20260318_ab12cd",
      masterPlotId: "mp_20260318_v2",
      action: "approve",
      reason: "Ready to ship.",
      triggeredTaskId: null,
      createdAt: "2026-03-18T12:10:00.000Z",
    });
  });

  it("migrates a legacy storyboard_reviews table that lacks master_plot_id", async () => {
    const { db, repository } = await createRepositoryContext({
      legacyStoryboardReviewsTable: true,
      seedLegacyStoryboardReview: {
        id: "sbr_20260318_legacy",
        project_id: "proj_20260318_ab12cd",
        storyboard_version_id: "mp_20260318_legacy",
        action: "reject",
        reason: "Legacy row",
        triggered_task_id: null,
        created_at: "2026-03-18T12:00:00.000Z",
      },
    });

    const columns = db
      .prepare("PRAGMA table_info(storyboard_reviews)")
      .all() as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain("master_plot_id");
    expect(repository.findLatestByProjectId("proj_20260318_ab12cd")).toEqual({
      id: "sbr_20260318_legacy",
      projectId: "proj_20260318_ab12cd",
      masterPlotId: "mp_20260318_legacy",
      action: "reject",
      reason: "Legacy row",
      triggeredTaskId: null,
      createdAt: "2026-03-18T12:00:00.000Z",
    });
  });
});

async function createRepositoryContext(
  options: {
    legacyStoryboardReviewsTable?: boolean;
    seedLegacyStoryboardReview?: {
      id: string;
      project_id: string;
      storyboard_version_id: string;
      action: string;
      reason: string | null;
      triggered_task_id: string | null;
      created_at: string;
    };
  } = {},
) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-review-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);

  if (options.legacyStoryboardReviewsTable) {
    db.exec(`
      CREATE TABLE storyboard_reviews (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        storyboard_version_id TEXT NOT NULL,
        action TEXT NOT NULL,
        reason TEXT,
        triggered_task_id TEXT,
        created_at TEXT NOT NULL
      )
    `);

    if (options.seedLegacyStoryboardReview) {
      db.prepare(
        `
          INSERT INTO storyboard_reviews (
            id,
            project_id,
            storyboard_version_id,
            action,
            reason,
            triggered_task_id,
            created_at
          ) VALUES (
            @id,
            @project_id,
            @storyboard_version_id,
            @action,
            @reason,
            @triggered_task_id,
            @created_at
          )
        `,
      ).run(options.seedLegacyStoryboardReview);
    }
  }

  initializeSqliteSchema(db);

  return {
    db,
    projectRepository: createSqliteProjectRepository({ db }),
    storyboardVersionRepository: createSqliteStoryboardVersionRepository({ db }),
    repository: createSqliteStoryboardReviewRepository({ db }),
  };
}
