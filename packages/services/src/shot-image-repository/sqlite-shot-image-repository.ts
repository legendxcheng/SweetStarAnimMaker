import type { ShotImageRepository, ShotReferenceRecordEntity } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";
import {
  fromBatchRow,
  fromFrameRow,
  fromShotRow,
  toBatchRow,
  toFrameRow,
  toShotRow,
  type ShotImageBatchRow,
  type ShotImageFrameRow,
  type ShotImageShotRow,
} from "./sqlite-shot-image-mappers";

export interface CreateSqliteShotImageRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteShotImageRepository(
  options: CreateSqliteShotImageRepositoryOptions,
): ShotImageRepository {
  const insertShotRow = (shot: ShotReferenceRecordEntity) => {
    options.db
      .prepare(
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
      )
      .run(toShotRow(shot));
  };

  const updateShotRow = (shot: ShotReferenceRecordEntity) => {
    options.db
      .prepare(
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
      )
      .run(toShotRow(shot));
  };

  return {
    insertBatch(batch) {
      options.db
        .prepare(
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
        )
        .run(toBatchRow(batch));
    },
    findBatchById(batchId) {
      const row = options.db
        .prepare("SELECT * FROM shot_image_batches WHERE id = ?")
        .get(batchId) as ShotImageBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
    findCurrentBatchByProjectId(projectId) {
      const row = options.db
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
    listFramesByBatchId(batchId) {
      const shotRows = options.db
        .prepare(
          `
            SELECT *
            FROM shot_image_shots
            WHERE batch_id = ?
            ORDER BY segment_order ASC, shot_order ASC
          `,
        )
        .all(batchId) as ShotImageShotRow[];

      if (shotRows.length > 0) {
        return shotRows
          .map(fromShotRow)
          .flatMap((shot) => [shot.startFrame, ...(shot.endFrame ? [shot.endFrame] : [])]);
      }

      const rows = options.db
        .prepare(
          `
            SELECT *
            FROM shot_image_frames
            WHERE batch_id = ?
            ORDER BY frame_order ASC, frame_type ASC
          `,
        )
        .all(batchId) as ShotImageFrameRow[];

      return rows.map(fromFrameRow);
    },
    listShotsByBatchId(batchId) {
      const rows = options.db
        .prepare(
          `
            SELECT *
            FROM shot_image_shots
            WHERE batch_id = ?
            ORDER BY segment_order ASC, shot_order ASC
          `,
        )
        .all(batchId) as ShotImageShotRow[];

      return rows.map(fromShotRow);
    },
    listSegmentsByBatchId(batchId) {
      const rows = options.db
        .prepare(
          `
            SELECT *
            FROM shot_image_shots
            WHERE batch_id = ?
            ORDER BY segment_order ASC, shot_order ASC
          `,
        )
        .all(batchId) as ShotImageShotRow[];

      return rows.map(fromShotRow);
    },
    insertFrame(frame) {
      options.db
        .prepare(
          `
            INSERT INTO shot_image_frames (
              id,
              batch_id,
              project_id,
              project_storage_dir,
              source_shot_script_id,
              segment_id,
              scene_id,
              frame_order,
              frame_type,
              plan_status,
              image_status,
              selected_character_ids,
              matched_reference_image_paths,
              unmatched_character_ids,
              prompt_text_seed,
              prompt_text_current,
              negative_prompt_text_current,
              prompt_updated_at,
              image_asset_path,
              image_width,
              image_height,
              provider,
              model,
              approved_at,
              updated_at,
              source_task_id,
              storage_dir,
              planning_rel_path,
              prompt_seed_rel_path,
              prompt_current_rel_path,
              current_image_rel_path,
              current_metadata_rel_path,
              prompt_versions_storage_dir,
              versions_storage_dir
            ) VALUES (
              @id,
              @batch_id,
              @project_id,
              @project_storage_dir,
              @source_shot_script_id,
              @segment_id,
              @scene_id,
              @frame_order,
              @frame_type,
              @plan_status,
              @image_status,
              @selected_character_ids,
              @matched_reference_image_paths,
              @unmatched_character_ids,
              @prompt_text_seed,
              @prompt_text_current,
              @negative_prompt_text_current,
              @prompt_updated_at,
              @image_asset_path,
              @image_width,
              @image_height,
              @provider,
              @model,
              @approved_at,
              @updated_at,
              @source_task_id,
              @storage_dir,
              @planning_rel_path,
              @prompt_seed_rel_path,
              @prompt_current_rel_path,
              @current_image_rel_path,
              @current_metadata_rel_path,
              @prompt_versions_storage_dir,
              @versions_storage_dir
            )
          `,
        )
        .run(toFrameRow(frame));
    },
    insertShot(shot) {
      insertShotRow(shot);
    },
    insertSegment(segment) {
      insertShotRow(segment);
    },
    findFrameById(frameId) {
      const shotRow = options.db
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

      if (shotRow) {
        const shot = fromShotRow(shotRow);
        return shot.startFrame.id === frameId ? shot.startFrame : (shot.endFrame ?? null);
      }

      const row = options.db
        .prepare("SELECT * FROM shot_image_frames WHERE id = ?")
        .get(frameId) as ShotImageFrameRow | undefined;

      return row ? fromFrameRow(row) : null;
    },
    findShotById(shotId) {
      const row = options.db
        .prepare("SELECT * FROM shot_image_shots WHERE id = ?")
        .get(shotId) as ShotImageShotRow | undefined;

      return row ? fromShotRow(row) : null;
    },
    findSegmentById(segmentId) {
      const row = options.db
        .prepare("SELECT * FROM shot_image_shots WHERE id = ?")
        .get(segmentId) as ShotImageShotRow | undefined;

      return row ? fromShotRow(row) : null;
    },
    updateFrame(frame) {
      const shotRow = options.db
        .prepare(
          `
            SELECT *
            FROM shot_image_shots
            WHERE json_extract(start_frame_json, '$.id') = ?
               OR json_extract(end_frame_json, '$.id') = ?
            LIMIT 1
          `,
        )
        .get(frame.id, frame.id) as ShotImageShotRow | undefined;

      if (shotRow) {
        const shot = fromShotRow(shotRow);
        const startFrame = shot.startFrame.id === frame.id ? frame : shot.startFrame;
        const updatedShot: ShotReferenceRecordEntity =
          shot.frameDependency === "start_and_end_frame"
            ? {
                ...shot,
                startFrame,
                endFrame: shot.endFrame.id === frame.id ? frame : shot.endFrame,
                updatedAt: frame.updatedAt,
              }
            : {
                ...shot,
                startFrame,
                endFrame: null,
                updatedAt: frame.updatedAt,
              };

        updateShotRow(updatedShot);
        return;
      }

      options.db
        .prepare(
          `
            UPDATE shot_image_frames
            SET
              plan_status = @plan_status,
              image_status = @image_status,
              selected_character_ids = @selected_character_ids,
              matched_reference_image_paths = @matched_reference_image_paths,
              unmatched_character_ids = @unmatched_character_ids,
              prompt_text_seed = @prompt_text_seed,
              prompt_text_current = @prompt_text_current,
              negative_prompt_text_current = @negative_prompt_text_current,
              prompt_updated_at = @prompt_updated_at,
              image_asset_path = @image_asset_path,
              image_width = @image_width,
              image_height = @image_height,
              provider = @provider,
              model = @model,
              approved_at = @approved_at,
              updated_at = @updated_at,
              source_task_id = @source_task_id,
              storage_dir = @storage_dir,
              planning_rel_path = @planning_rel_path,
              prompt_seed_rel_path = @prompt_seed_rel_path,
              prompt_current_rel_path = @prompt_current_rel_path,
              current_image_rel_path = @current_image_rel_path,
              current_metadata_rel_path = @current_metadata_rel_path,
              prompt_versions_storage_dir = @prompt_versions_storage_dir,
              versions_storage_dir = @versions_storage_dir
            WHERE id = @id
          `,
        )
        .run(toFrameRow(frame));
    },
    updateShot(shot) {
      updateShotRow(shot);
    },
    updateSegment(segment) {
      updateShotRow(segment);
    },
  };
}
