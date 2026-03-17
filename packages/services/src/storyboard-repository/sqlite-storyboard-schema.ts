import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteStoryboardSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS storyboard_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_task_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      file_rel_path TEXT NOT NULL,
      raw_response_rel_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      UNIQUE(project_id, version_number)
    )
  `);
}
