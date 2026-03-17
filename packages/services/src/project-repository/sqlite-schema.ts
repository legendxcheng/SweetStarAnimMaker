import type { SqliteDatabase } from "./sqlite-db";
import { initializeSqliteTaskSchema } from "../task-repository/sqlite-task-schema";
import { initializeSqliteStoryboardSchema } from "../storyboard-repository/sqlite-storyboard-schema";

export function initializeSqliteSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      storage_dir TEXT NOT NULL,
      script_rel_path TEXT NOT NULL,
      script_bytes INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      script_updated_at TEXT NOT NULL,
      current_storyboard_version_id TEXT NULL
    )
  `);

  ensureProjectsColumn(db, "current_storyboard_version_id", "TEXT NULL");

  initializeSqliteStoryboardSchema(db);
  initializeSqliteTaskSchema(db);
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
