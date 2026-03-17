import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteTaskSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      queue_name TEXT NOT NULL,
      storage_dir TEXT NOT NULL,
      input_rel_path TEXT NOT NULL,
      output_rel_path TEXT NOT NULL,
      log_rel_path TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT
    )
  `);
}
