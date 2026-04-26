import type { ShotImageRepository, ShotReferenceRecordEntity } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";
import {
  fromShotRow,
  toShotRow,
  type ShotImageShotRow,
} from "./sqlite-shot-image-mappers";

export interface SqliteShotImageShotQueries {
  insertShotRow(shot: ShotReferenceRecordEntity): void;
  updateShotRow(shot: ShotReferenceRecordEntity): void;
  findShotRowByFrameId(frameId: string): ShotImageShotRow | undefined;
}

type SqliteShotImageShotMethods = Pick<
  ShotImageRepository,
  | "insertShot"
  | "insertSegment"
  | "listShotsByBatchId"
  | "listSegmentsByBatchId"
  | "findShotById"
  | "findSegmentById"
  | "updateShot"
  | "updateSegment"
>;

export function createSqliteShotImageShotQueries(
  db: SqliteDatabase,
): SqliteShotImageShotQueries {
  return {
    insertShotRow(shot) {
      db.prepare(
        `
          INSERT INTO shot_image_shots (
            id,
            batch_id,
            project_id,
            project_storage_dir,
            source_shot_script_id,
            scene_id,
            segment_id,
            shot_id,
            shot_code,
            segment_order,
            segment_name,
            segment_summary,
            source_shot_ids_json,
            shot_order,
            duration_sec,
            frame_dependency,
            status,
            reference_status,
            approved_at,
            updated_at,
            storage_dir,
            manifest_rel_path,
            start_frame_json,
            end_frame_json
          ) VALUES (
            @id,
            @batch_id,
            @project_id,
            @project_storage_dir,
            @source_shot_script_id,
            @scene_id,
            @segment_id,
            @shot_id,
            @shot_code,
            @segment_order,
            @segment_name,
            @segment_summary,
            @source_shot_ids_json,
            @shot_order,
            @duration_sec,
            @frame_dependency,
            @status,
            @reference_status,
            @approved_at,
            @updated_at,
            @storage_dir,
            @manifest_rel_path,
            @start_frame_json,
            @end_frame_json
          )
        `,
      ).run(toShotRow(shot));
    },
    updateShotRow(shot) {
      db.prepare(
        `
          UPDATE shot_image_shots
          SET
            project_id = @project_id,
            project_storage_dir = @project_storage_dir,
            source_shot_script_id = @source_shot_script_id,
            scene_id = @scene_id,
            segment_id = @segment_id,
            shot_id = @shot_id,
            shot_code = @shot_code,
            segment_order = @segment_order,
            segment_name = @segment_name,
            segment_summary = @segment_summary,
            source_shot_ids_json = @source_shot_ids_json,
            shot_order = @shot_order,
            duration_sec = @duration_sec,
            frame_dependency = @frame_dependency,
            status = @status,
            reference_status = @reference_status,
            approved_at = @approved_at,
            updated_at = @updated_at,
            storage_dir = @storage_dir,
            manifest_rel_path = @manifest_rel_path,
            start_frame_json = @start_frame_json,
            end_frame_json = @end_frame_json
          WHERE id = @id
        `,
      ).run(toShotRow(shot));
    },
    findShotRowByFrameId(frameId) {
      return db
        .prepare(
          `
            SELECT *
            FROM shot_image_shots
            WHERE json_extract(start_frame_json, '$.id') = ?
               OR json_extract(end_frame_json, '$.id') = ?
            LIMIT 1
          `,
        )
        .get(frameId, frameId) as ShotImageShotRow | undefined;
    },
  };
}

export function createSqliteShotImageShotMethods(
  db: SqliteDatabase,
  shotQueries: SqliteShotImageShotQueries,
): SqliteShotImageShotMethods {
  return {
    listShotsByBatchId(batchId) {
      const rows = selectShotRowsByBatchId(db, batchId);

      return rows.map(fromShotRow);
    },
    listSegmentsByBatchId(batchId) {
      const rows = selectShotRowsByBatchId(db, batchId);

      return rows.map(fromShotRow);
    },
    insertShot(shot) {
      shotQueries.insertShotRow(shot);
    },
    insertSegment(segment) {
      shotQueries.insertShotRow(segment);
    },
    findShotById(shotId) {
      const row = db
        .prepare("SELECT * FROM shot_image_shots WHERE id = ?")
        .get(shotId) as ShotImageShotRow | undefined;

      return row ? fromShotRow(row) : null;
    },
    findSegmentById(segmentId) {
      const row = db
        .prepare("SELECT * FROM shot_image_shots WHERE id = ?")
        .get(segmentId) as ShotImageShotRow | undefined;

      return row ? fromShotRow(row) : null;
    },
    updateShot(shot) {
      shotQueries.updateShotRow(shot);
    },
    updateSegment(segment) {
      shotQueries.updateShotRow(segment);
    },
  };
}

export function selectShotRowsByBatchId(
  db: SqliteDatabase,
  batchId: string,
): ShotImageShotRow[] {
  return db
    .prepare(
      `
        SELECT *
        FROM shot_image_shots
        WHERE batch_id = ?
        ORDER BY segment_order ASC, shot_order ASC
      `,
    )
    .all(batchId) as ShotImageShotRow[];
}
