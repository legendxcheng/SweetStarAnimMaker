import type {
  SegmentFrameRecordEntity,
  ShotImageBatchRecord,
  ShotImageRepository,
} from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

export interface CreateSqliteShotImageRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteShotImageRepository(
  options: CreateSqliteShotImageRepositoryOptions,
): ShotImageRepository {
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
              total_frame_count,
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
              @total_frame_count,
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
    findFrameById(frameId) {
      const row = options.db
        .prepare("SELECT * FROM shot_image_frames WHERE id = ?")
        .get(frameId) as ShotImageFrameRow | undefined;

      return row ? fromFrameRow(row) : null;
    },
    updateFrame(frame) {
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
  };
}

interface ShotImageBatchRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_shot_script_id: string;
  segment_count: number;
  total_frame_count: number;
  storage_dir: string;
  manifest_rel_path: string;
  created_at: string;
  updated_at: string;
}

interface ShotImageFrameRow {
  id: string;
  batch_id: string;
  project_id: string;
  project_storage_dir: string;
  source_shot_script_id: string;
  segment_id: string;
  scene_id: string;
  frame_order: number;
  frame_type: SegmentFrameRecordEntity["frameType"];
  plan_status: SegmentFrameRecordEntity["planStatus"];
  image_status: SegmentFrameRecordEntity["imageStatus"];
  selected_character_ids: string;
  matched_reference_image_paths: string;
  unmatched_character_ids: string;
  prompt_text_seed: string;
  prompt_text_current: string;
  negative_prompt_text_current: string | null;
  prompt_updated_at: string | null;
  image_asset_path: string | null;
  image_width: number | null;
  image_height: number | null;
  provider: string | null;
  model: string | null;
  approved_at: string | null;
  updated_at: string;
  source_task_id: string | null;
  storage_dir: string;
  planning_rel_path: string;
  prompt_seed_rel_path: string;
  prompt_current_rel_path: string;
  current_image_rel_path: string;
  current_metadata_rel_path: string;
  prompt_versions_storage_dir: string;
  versions_storage_dir: string;
}

function toBatchRow(batch: ShotImageBatchRecord): ShotImageBatchRow {
  return {
    id: batch.id,
    project_id: batch.projectId,
    project_storage_dir: batch.projectStorageDir,
    source_shot_script_id: batch.sourceShotScriptId,
    segment_count: batch.segmentCount,
    total_frame_count: batch.totalFrameCount,
    storage_dir: batch.storageDir,
    manifest_rel_path: batch.manifestRelPath,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

function fromBatchRow(row: ShotImageBatchRow): ShotImageBatchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceShotScriptId: row.source_shot_script_id,
    segmentCount: row.segment_count,
    totalFrameCount: row.total_frame_count,
    storageDir: row.storage_dir,
    manifestRelPath: row.manifest_rel_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toFrameRow(frame: SegmentFrameRecordEntity): ShotImageFrameRow {
  return {
    id: frame.id,
    batch_id: frame.batchId,
    project_id: frame.projectId,
    project_storage_dir: frame.projectStorageDir,
    source_shot_script_id: frame.sourceShotScriptId,
    segment_id: frame.segmentId,
    scene_id: frame.sceneId,
    frame_order: frame.order,
    frame_type: frame.frameType,
    plan_status: frame.planStatus,
    image_status: frame.imageStatus,
    selected_character_ids: JSON.stringify(frame.selectedCharacterIds),
    matched_reference_image_paths: JSON.stringify(frame.matchedReferenceImagePaths),
    unmatched_character_ids: JSON.stringify(frame.unmatchedCharacterIds),
    prompt_text_seed: frame.promptTextSeed,
    prompt_text_current: frame.promptTextCurrent,
    negative_prompt_text_current: frame.negativePromptTextCurrent,
    prompt_updated_at: frame.promptUpdatedAt,
    image_asset_path: frame.imageAssetPath,
    image_width: frame.imageWidth,
    image_height: frame.imageHeight,
    provider: frame.provider,
    model: frame.model,
    approved_at: frame.approvedAt,
    updated_at: frame.updatedAt,
    source_task_id: frame.sourceTaskId,
    storage_dir: frame.storageDir,
    planning_rel_path: frame.planningRelPath,
    prompt_seed_rel_path: frame.promptSeedRelPath,
    prompt_current_rel_path: frame.promptCurrentRelPath,
    current_image_rel_path: frame.currentImageRelPath,
    current_metadata_rel_path: frame.currentMetadataRelPath,
    prompt_versions_storage_dir: frame.promptVersionsStorageDir,
    versions_storage_dir: frame.versionsStorageDir,
  };
}

function fromFrameRow(row: ShotImageFrameRow): SegmentFrameRecordEntity {
  return {
    id: row.id,
    batchId: row.batch_id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceShotScriptId: row.source_shot_script_id,
    segmentId: row.segment_id,
    sceneId: row.scene_id,
    order: row.frame_order,
    frameType: row.frame_type,
    planStatus: row.plan_status,
    imageStatus: row.image_status,
    selectedCharacterIds: JSON.parse(row.selected_character_ids) as string[],
    matchedReferenceImagePaths: JSON.parse(row.matched_reference_image_paths) as string[],
    unmatchedCharacterIds: JSON.parse(row.unmatched_character_ids) as string[],
    promptTextSeed: row.prompt_text_seed,
    promptTextCurrent: row.prompt_text_current,
    negativePromptTextCurrent: row.negative_prompt_text_current,
    promptUpdatedAt: row.prompt_updated_at,
    imageAssetPath: row.image_asset_path,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    provider: row.provider,
    model: row.model,
    approvedAt: row.approved_at,
    updatedAt: row.updated_at,
    sourceTaskId: row.source_task_id,
    storageDir: row.storage_dir,
    planningRelPath: row.planning_rel_path,
    promptSeedRelPath: row.prompt_seed_rel_path,
    promptCurrentRelPath: row.prompt_current_rel_path,
    currentImageRelPath: row.current_image_rel_path,
    currentMetadataRelPath: row.current_metadata_rel_path,
    promptVersionsStorageDir: row.prompt_versions_storage_dir,
    versionsStorageDir: row.versions_storage_dir,
  };
}
