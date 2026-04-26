import type { ShotImageRepository } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";
import {
  fromBatchRow,
  toBatchRow,
  type ShotImageBatchRow,
} from "./sqlite-shot-image-mappers";

type SqliteShotImageBatchMethods = Pick<
  ShotImageRepository,
  "insertBatch" | "findBatchById" | "findCurrentBatchByProjectId"
>;

export function createSqliteShotImageBatchMethods(
  db: SqliteDatabase,
): SqliteShotImageBatchMethods {
  return {
    insertBatch(batch) {
      db.prepare(
        `
          INSERT INTO shot_image_batches (
            id,
            project_id,
            project_storage_dir,
            source_shot_script_id,
            segment_count,
            shot_count,
            total_frame_count,
            total_required_frame_count,
            storage_dir,
            manifest_rel_path,
            created_at,
            updated_at
          ) VALUES (
            @id,
            @project_id,
            @project_storage_dir,
            @source_shot_script_id,
            @segment_count,
            @shot_count,
            @total_frame_count,
            @total_required_frame_count,
            @storage_dir,
            @manifest_rel_path,
            @created_at,
            @updated_at
          )
        `,
      ).run(toBatchRow(batch));
    },
    findBatchById(batchId) {
      const row = db
        .prepare("SELECT * FROM shot_image_batches WHERE id = ?")
        .get(batchId) as ShotImageBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
    findCurrentBatchByProjectId(projectId) {
      const row = db
        .prepare(
          `
            SELECT batch.*
            FROM projects project
            JOIN shot_image_batches batch ON batch.id = project.current_image_batch_id
            WHERE project.id = ?
          `,
        )
        .get(projectId) as ShotImageBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
  };
}
