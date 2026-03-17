import type { SqliteDatabase } from "./sqlite-db";
import { initializeSqliteTaskSchema } from "../task-repository/sqlite-task-schema";

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
      script_updated_at TEXT NOT NULL
    )
  `);

  initializeSqliteTaskSchema(db);
}
