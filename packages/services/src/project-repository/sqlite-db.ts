import fs from "node:fs";

import Database from "better-sqlite3";

import type { LocalDataPaths } from "../storage/local-data-paths";

export interface CreateSqliteDbOptions {
  paths: LocalDataPaths;
}

export function createSqliteDb(options: CreateSqliteDbOptions) {
  fs.mkdirSync(options.paths.sqliteDir, { recursive: true });
  return new Database(options.paths.sqliteDbPath);
}

export type SqliteDatabase = ReturnType<typeof createSqliteDb>;
