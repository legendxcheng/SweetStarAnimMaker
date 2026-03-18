import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteStoryboardReviewSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS storyboard_reviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      storyboard_version_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      triggered_task_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(storyboard_version_id) REFERENCES storyboard_versions(id),
      FOREIGN KEY(triggered_task_id) REFERENCES tasks(id)
    )
  `);
}
