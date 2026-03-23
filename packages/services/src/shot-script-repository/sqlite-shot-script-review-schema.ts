import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteShotScriptReviewSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shot_script_reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      shot_script_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      next_action TEXT,
      triggered_task_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(triggered_task_id) REFERENCES tasks(id)
    )
  `);
}
