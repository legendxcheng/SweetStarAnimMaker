import type { ShotImageRepository } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";
import { createSqliteShotImageBatchMethods } from "./sqlite-shot-image-batches";
import { createSqliteShotImageFrameMethods } from "./sqlite-shot-image-frames";
import {
  createSqliteShotImageShotMethods,
  createSqliteShotImageShotQueries,
} from "./sqlite-shot-image-shots";

export interface CreateSqliteShotImageRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteShotImageRepository(
  options: CreateSqliteShotImageRepositoryOptions,
): ShotImageRepository {
  const shotQueries = createSqliteShotImageShotQueries(options.db);

  return {
    ...createSqliteShotImageBatchMethods(options.db),
    ...createSqliteShotImageFrameMethods(options.db, shotQueries),
    ...createSqliteShotImageShotMethods(options.db, shotQueries),
  };
}
