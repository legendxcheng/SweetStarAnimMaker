import type { SqliteDatabase } from "./sqlite-db";
import { initializeSqliteTaskSchema } from "../task-repository/sqlite-task-schema";
import { initializeSqliteStoryboardSchema } from "../storyboard-repository/sqlite-storyboard-schema";
import { initializeSqliteStoryboardReviewSchema } from "../storyboard-repository/sqlite-storyboard-review-schema";
import { initializeSqliteCharacterSheetSchema } from "../character-sheet-repository/sqlite-character-sheet-schema";

export function initializeSqliteSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      storage_dir TEXT NOT NULL,
      premise_rel_path TEXT NOT NULL,
      premise_bytes INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      premise_updated_at TEXT NOT NULL,
      current_master_plot_id TEXT NULL,
      current_character_sheet_batch_id TEXT NULL,
      current_storyboard_id TEXT NULL
    )
  `);

  ensureProjectsColumn(db, "premise_rel_path", "TEXT NULL");
  ensureProjectsColumn(db, "premise_bytes", "INTEGER NULL");
  ensureProjectsColumn(db, "premise_updated_at", "TEXT NULL");
  ensureProjectsColumn(db, "current_master_plot_id", "TEXT NULL");
  ensureProjectsColumn(db, "current_character_sheet_batch_id", "TEXT NULL");
  ensureProjectsColumn(db, "current_storyboard_id", "TEXT NULL");

  initializeSqliteStoryboardSchema(db);
  initializeSqliteCharacterSheetSchema(db);
  initializeSqliteTaskSchema(db);
  initializeSqliteStoryboardReviewSchema(db);
  ensureStoryboardReviewsColumn(db, "master_plot_id", "TEXT NOT NULL DEFAULT ''");
  backfillStoryboardReviewMasterPlotId(db);
  migrateLegacyStoryboardReviewsTable(db);
}

function ensureProjectsColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE projects ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function ensureStoryboardReviewsColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'storyboard_reviews'")
    .get() as { name: string } | undefined;

  if (!table) {
    return;
  }

  const columns = db
    .prepare("PRAGMA table_info(storyboard_reviews)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE storyboard_reviews ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function backfillStoryboardReviewMasterPlotId(db: SqliteDatabase) {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'storyboard_reviews'")
    .get() as { name: string } | undefined;

  if (!table) {
    return;
  }

  const columns = db
    .prepare("PRAGMA table_info(storyboard_reviews)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === "storyboard_version_id")) {
    return;
  }

  db.exec(`
    UPDATE storyboard_reviews
    SET master_plot_id = storyboard_version_id
    WHERE master_plot_id = ''
  `);
}

function migrateLegacyStoryboardReviewsTable(db: SqliteDatabase) {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'storyboard_reviews'")
    .get() as { name: string } | undefined;

  if (!table) {
    return;
  }

  const columns = db
    .prepare("PRAGMA table_info(storyboard_reviews)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === "storyboard_version_id")) {
    return;
  }

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    CREATE TABLE storyboard_reviews__migrated (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      master_plot_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      triggered_task_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(triggered_task_id) REFERENCES tasks(id)
    );

    INSERT INTO storyboard_reviews__migrated (
      id,
      project_id,
      master_plot_id,
      action,
      reason,
      triggered_task_id,
      created_at
    )
    SELECT
      id,
      project_id,
      CASE
        WHEN master_plot_id IS NOT NULL AND master_plot_id != '' THEN master_plot_id
        ELSE storyboard_version_id
      END,
      action,
      reason,
      triggered_task_id,
      created_at
    FROM storyboard_reviews;

    DROP TABLE storyboard_reviews;
    ALTER TABLE storyboard_reviews__migrated RENAME TO storyboard_reviews;

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}
