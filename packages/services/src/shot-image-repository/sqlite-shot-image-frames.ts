import type {
  SegmentFrameRecordEntity,
  ShotImageRepository,
  ShotReferenceRecordEntity,
} from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";
import {
  fromFrameRow,
  fromShotRow,
  toFrameRow,
  type ShotImageFrameRow,
} from "./sqlite-shot-image-mappers";
import {
  selectShotRowsByBatchId,
  type SqliteShotImageShotQueries,
} from "./sqlite-shot-image-shots";

type SqliteShotImageFrameMethods = Pick<
  ShotImageRepository,
  "insertFrame" | "listFramesByBatchId" | "findFrameById" | "updateFrame"
>;

export function createSqliteShotImageFrameMethods(
  db: SqliteDatabase,
  shotQueries: SqliteShotImageShotQueries,
): SqliteShotImageFrameMethods {
  return {
    listFramesByBatchId(batchId) {
      const shotRows = selectShotRowsByBatchId(db, batchId);

      if (shotRows.length > 0) {
        return shotRows
          .map(fromShotRow)
          .flatMap((shot) => [shot.startFrame, ...(shot.endFrame ? [shot.endFrame] : [])]);
      }

      const rows = db
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
    insertFrame(frame) {
      db.prepare(
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
      ).run(toFrameRow(frame));
    },
    findFrameById(frameId) {
      const shotRow = shotQueries.findShotRowByFrameId(frameId);

      if (shotRow) {
        const shot = fromShotRow(shotRow);
        return shot.startFrame.id === frameId ? shot.startFrame : (shot.endFrame ?? null);
      }

      const row = db
        .prepare("SELECT * FROM shot_image_frames WHERE id = ?")
        .get(frameId) as ShotImageFrameRow | undefined;

      return row ? fromFrameRow(row) : null;
    },
    updateFrame(frame) {
      const shotRow = shotQueries.findShotRowByFrameId(frame.id);

      if (shotRow) {
        shotQueries.updateShotRow(updateShotFrame(fromShotRow(shotRow), frame));
        return;
      }

      db.prepare(
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
      ).run(toFrameRow(frame));
    },
  };
}

function updateShotFrame(
  shot: ShotReferenceRecordEntity,
  frame: SegmentFrameRecordEntity,
): ShotReferenceRecordEntity {
  const startFrame = shot.startFrame.id === frame.id ? frame : shot.startFrame;

  if (shot.frameDependency === "start_and_end_frame") {
    return {
      ...shot,
      startFrame,
      endFrame: shot.endFrame.id === frame.id ? frame : shot.endFrame,
      updatedAt: frame.updatedAt,
    };
  }

  return {
    ...shot,
    startFrame,
    endFrame: null,
    updatedAt: frame.updatedAt,
  };
}
