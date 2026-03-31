import type {
  FinalCutRecordEntity,
  SegmentVideoRecordEntity,
  VideoBatchRecord,
  VideoRepository,
} from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

export interface CreateSqliteVideoRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteVideoRepository(
  options: CreateSqliteVideoRepositoryOptions,
): VideoRepository {
  return {
    insertBatch(batch) {
      options.db
        .prepare(
          `
            INSERT INTO video_batches (
              id, project_id, project_storage_dir, source_image_batch_id, source_shot_script_id,
              shot_count, segment_count, storage_dir, manifest_rel_path, created_at, updated_at
            ) VALUES (
              @id, @project_id, @project_storage_dir, @source_image_batch_id, @source_shot_script_id,
              @shot_count, @segment_count, @storage_dir, @manifest_rel_path, @created_at, @updated_at
            )
          `,
        )
        .run(toBatchRow(batch));
    },
    findBatchById(batchId) {
      const row = options.db
        .prepare("SELECT * FROM video_batches WHERE id = ?")
        .get(batchId) as VideoBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
    findCurrentBatchByProjectId(projectId) {
      const row = options.db
        .prepare(
          `
            SELECT batch.*
            FROM projects project
            JOIN video_batches batch ON batch.id = project.current_video_batch_id
            WHERE project.id = ?
          `,
        )
        .get(projectId) as VideoBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
    listSegmentsByBatchId(batchId) {
      const rows = options.db
        .prepare(
          `
            SELECT *
            FROM segment_videos
            WHERE batch_id = ?
            ORDER BY segment_order ASC, shot_order ASC, updated_at ASC
          `,
        )
        .all(batchId) as SegmentVideoRow[];

      return rows.map(fromSegmentRow);
    },
    insertSegment(segment) {
      options.db
        .prepare(
          `
            INSERT INTO segment_videos (
              id, batch_id, project_id, project_storage_dir, source_image_batch_id, source_shot_script_id,
              shot_id, shot_code, scene_id, segment_id, segment_order, shot_order, frame_dependency, status,
              prompt_text_seed, prompt_text_current, prompt_updated_at, video_asset_path,
              thumbnail_asset_path, duration_sec, provider, model, updated_at, approved_at,
              source_task_id, storage_dir, current_video_rel_path, current_metadata_rel_path,
              thumbnail_rel_path, versions_storage_dir
            ) VALUES (
              @id, @batch_id, @project_id, @project_storage_dir, @source_image_batch_id, @source_shot_script_id,
              @shot_id, @shot_code, @scene_id, @segment_id, @segment_order, @shot_order, @frame_dependency, @status,
              @prompt_text_seed, @prompt_text_current, @prompt_updated_at, @video_asset_path,
              @thumbnail_asset_path, @duration_sec, @provider, @model, @updated_at, @approved_at,
              @source_task_id, @storage_dir, @current_video_rel_path, @current_metadata_rel_path,
              @thumbnail_rel_path, @versions_storage_dir
            )
          `,
        )
        .run(toSegmentRow(segment));
    },
    findSegmentById(segmentId) {
      const row = options.db
        .prepare("SELECT * FROM segment_videos WHERE id = ?")
        .get(segmentId) as SegmentVideoRow | undefined;

      return row ? fromSegmentRow(row) : null;
    },
    findCurrentSegmentByProjectIdAndSegmentId(projectId, segmentId) {
      const row = options.db
        .prepare(
          `
            SELECT segment.*
            FROM projects project
            JOIN segment_videos segment ON segment.batch_id = project.current_video_batch_id
            WHERE project.id = ? AND segment.segment_id = ?
            ORDER BY segment.shot_order ASC
            LIMIT 1
          `,
        )
        .get(projectId, segmentId) as SegmentVideoRow | undefined;

      return row ? fromSegmentRow(row) : null;
    },
    findCurrentSegmentByProjectIdAndSceneIdAndSegmentId(projectId, sceneId, segmentId) {
      const row = options.db
        .prepare(
          `
            SELECT segment.*
            FROM projects project
            JOIN segment_videos segment ON segment.batch_id = project.current_video_batch_id
            WHERE project.id = ? AND segment.scene_id = ? AND segment.segment_id = ?
            ORDER BY segment.shot_order ASC
            LIMIT 1
          `,
        )
        .get(projectId, sceneId, segmentId) as SegmentVideoRow | undefined;

      return row ? fromSegmentRow(row) : null;
    },
    findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId(
      projectId,
      sceneId,
      segmentId,
      shotId,
    ) {
      const row = options.db
        .prepare(
          `
            SELECT segment.*
            FROM projects project
            JOIN segment_videos segment ON segment.batch_id = project.current_video_batch_id
            WHERE project.id = ? AND segment.scene_id = ? AND segment.segment_id = ? AND segment.shot_id = ?
            LIMIT 1
          `,
        )
        .get(projectId, sceneId, segmentId, shotId) as SegmentVideoRow | undefined;

      return row ? fromSegmentRow(row) : null;
    },
    updateSegment(segment) {
      options.db
        .prepare(
          `
            UPDATE segment_videos
            SET
              shot_id = @shot_id,
              shot_code = @shot_code,
              scene_id = @scene_id,
              segment_id = @segment_id,
              segment_order = @segment_order,
              shot_order = @shot_order,
              frame_dependency = @frame_dependency,
              status = @status,
              prompt_text_seed = @prompt_text_seed,
              prompt_text_current = @prompt_text_current,
              prompt_updated_at = @prompt_updated_at,
              video_asset_path = @video_asset_path,
              thumbnail_asset_path = @thumbnail_asset_path,
              duration_sec = @duration_sec,
              provider = @provider,
              model = @model,
              updated_at = @updated_at,
              approved_at = @approved_at,
              source_task_id = @source_task_id,
              storage_dir = @storage_dir,
              current_video_rel_path = @current_video_rel_path,
              current_metadata_rel_path = @current_metadata_rel_path,
              thumbnail_rel_path = @thumbnail_rel_path,
              versions_storage_dir = @versions_storage_dir
            WHERE id = @id
          `,
        )
        .run(toSegmentRow(segment));
    },
    findCurrentFinalCutByProjectId(projectId) {
      const row = options.db
        .prepare("SELECT * FROM final_cuts WHERE project_id = ?")
        .get(projectId) as FinalCutRow | undefined;

      return row ? fromFinalCutRow(row) : null;
    },
    upsertFinalCut(finalCut) {
      options.db
        .prepare(
          `
            INSERT INTO final_cuts (
              id, project_id, project_storage_dir, source_video_batch_id, status, video_asset_path,
              manifest_asset_path, shot_count, created_at, updated_at, error_message, storage_dir,
              current_video_rel_path, current_metadata_rel_path, manifest_storage_rel_path,
              versions_storage_dir
            ) VALUES (
              @id, @project_id, @project_storage_dir, @source_video_batch_id, @status, @video_asset_path,
              @manifest_asset_path, @shot_count, @created_at, @updated_at, @error_message, @storage_dir,
              @current_video_rel_path, @current_metadata_rel_path, @manifest_storage_rel_path,
              @versions_storage_dir
            )
            ON CONFLICT(project_id) DO UPDATE SET
              id = excluded.id,
              project_storage_dir = excluded.project_storage_dir,
              source_video_batch_id = excluded.source_video_batch_id,
              status = excluded.status,
              video_asset_path = excluded.video_asset_path,
              manifest_asset_path = excluded.manifest_asset_path,
              shot_count = excluded.shot_count,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at,
              error_message = excluded.error_message,
              storage_dir = excluded.storage_dir,
              current_video_rel_path = excluded.current_video_rel_path,
              current_metadata_rel_path = excluded.current_metadata_rel_path,
              manifest_storage_rel_path = excluded.manifest_storage_rel_path,
              versions_storage_dir = excluded.versions_storage_dir
          `,
        )
        .run(toFinalCutRow(finalCut));
    },
  };
}

interface VideoBatchRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_image_batch_id: string;
  source_shot_script_id: string;
  shot_count: number | null;
  segment_count?: number | null;
  storage_dir: string;
  manifest_rel_path: string;
  created_at: string;
  updated_at: string;
}

interface SegmentVideoRow {
  id: string;
  batch_id: string;
  project_id: string;
  project_storage_dir: string;
  source_image_batch_id: string;
  source_shot_script_id: string;
  shot_id: string;
  shot_code: string;
  scene_id: string;
  segment_id: string;
  segment_order: number;
  shot_order: number;
  frame_dependency: SegmentVideoRecordEntity["frameDependency"];
  status: SegmentVideoRecordEntity["status"];
  prompt_text_seed: string;
  prompt_text_current: string;
  prompt_updated_at: string;
  video_asset_path: string | null;
  thumbnail_asset_path: string | null;
  duration_sec: number | null;
  provider: string | null;
  model: string | null;
  updated_at: string;
  approved_at: string | null;
  source_task_id: string | null;
  storage_dir: string;
  current_video_rel_path: string;
  current_metadata_rel_path: string;
  thumbnail_rel_path: string;
  versions_storage_dir: string;
}

interface FinalCutRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_video_batch_id: string;
  status: FinalCutRecordEntity["status"];
  video_asset_path: string | null;
  manifest_asset_path: string | null;
  shot_count: number;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  storage_dir: string;
  current_video_rel_path: string;
  current_metadata_rel_path: string;
  manifest_storage_rel_path: string;
  versions_storage_dir: string;
}

function toBatchRow(batch: VideoBatchRecord): VideoBatchRow {
  return {
    id: batch.id,
    project_id: batch.projectId,
    project_storage_dir: batch.projectStorageDir,
    source_image_batch_id: batch.sourceImageBatchId,
    source_shot_script_id: batch.sourceShotScriptId,
    shot_count: batch.shotCount ?? batch.segmentCount,
    segment_count: batch.segmentCount ?? batch.shotCount,
    storage_dir: batch.storageDir,
    manifest_rel_path: batch.manifestRelPath,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

function fromBatchRow(row: VideoBatchRow): VideoBatchRecord {
  const shotCount = row.shot_count ?? row.segment_count ?? 0;

  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceImageBatchId: row.source_image_batch_id,
    sourceShotScriptId: row.source_shot_script_id,
    shotCount,
    segmentCount: shotCount,
    storageDir: row.storage_dir,
    manifestRelPath: row.manifest_rel_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSegmentRow(segment: SegmentVideoRecordEntity): SegmentVideoRow {
  return {
    id: segment.id,
    batch_id: segment.batchId,
    project_id: segment.projectId,
    project_storage_dir: segment.projectStorageDir,
    source_image_batch_id: segment.sourceImageBatchId,
    source_shot_script_id: segment.sourceShotScriptId,
    shot_id: segment.shotId,
    shot_code: segment.shotCode,
    scene_id: segment.sceneId,
    segment_id: segment.segmentId,
    segment_order: segment.segmentOrder,
    shot_order: segment.shotOrder,
    frame_dependency: segment.frameDependency,
    status: segment.status,
    prompt_text_seed: segment.promptTextSeed,
    prompt_text_current: segment.promptTextCurrent,
    prompt_updated_at: segment.promptUpdatedAt,
    video_asset_path: segment.videoAssetPath,
    thumbnail_asset_path: segment.thumbnailAssetPath,
    duration_sec: segment.durationSec,
    provider: segment.provider,
    model: segment.model,
    updated_at: segment.updatedAt,
    approved_at: segment.approvedAt,
    source_task_id: segment.sourceTaskId,
    storage_dir: segment.storageDir,
    current_video_rel_path: segment.currentVideoRelPath,
    current_metadata_rel_path: segment.currentMetadataRelPath,
    thumbnail_rel_path: segment.thumbnailRelPath,
    versions_storage_dir: segment.versionsStorageDir,
  };
}

function fromSegmentRow(row: SegmentVideoRow): SegmentVideoRecordEntity {
  return {
    id: row.id,
    batchId: row.batch_id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceImageBatchId: row.source_image_batch_id,
    sourceShotScriptId: row.source_shot_script_id,
    shotId: row.shot_id,
    shotCode: row.shot_code,
    sceneId: row.scene_id,
    segmentId: row.segment_id,
    segmentOrder: row.segment_order,
    shotOrder: row.shot_order,
    frameDependency: row.frame_dependency,
    status: row.status,
    promptTextSeed: row.prompt_text_seed,
    promptTextCurrent: row.prompt_text_current,
    promptUpdatedAt: row.prompt_updated_at,
    videoAssetPath: row.video_asset_path,
    thumbnailAssetPath: row.thumbnail_asset_path,
    durationSec: row.duration_sec,
    provider: row.provider,
    model: row.model,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    sourceTaskId: row.source_task_id,
    storageDir: row.storage_dir,
    currentVideoRelPath: row.current_video_rel_path,
    currentMetadataRelPath: row.current_metadata_rel_path,
    thumbnailRelPath: row.thumbnail_rel_path,
    versionsStorageDir: row.versions_storage_dir,
  };
}

function toFinalCutRow(finalCut: FinalCutRecordEntity): FinalCutRow {
  return {
    id: finalCut.id,
    project_id: finalCut.projectId,
    project_storage_dir: finalCut.projectStorageDir,
    source_video_batch_id: finalCut.sourceVideoBatchId,
    status: finalCut.status,
    video_asset_path: finalCut.videoAssetPath,
    manifest_asset_path: finalCut.manifestAssetPath,
    shot_count: finalCut.shotCount,
    created_at: finalCut.createdAt,
    updated_at: finalCut.updatedAt,
    error_message: finalCut.errorMessage,
    storage_dir: finalCut.storageDir,
    current_video_rel_path: finalCut.currentVideoRelPath,
    current_metadata_rel_path: finalCut.currentMetadataRelPath,
    manifest_storage_rel_path: finalCut.manifestStorageRelPath,
    versions_storage_dir: finalCut.versionsStorageDir,
  };
}

function fromFinalCutRow(row: FinalCutRow): FinalCutRecordEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceVideoBatchId: row.source_video_batch_id,
    status: row.status,
    videoAssetPath: row.video_asset_path,
    manifestAssetPath: row.manifest_asset_path,
    shotCount: row.shot_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    errorMessage: row.error_message,
    storageDir: row.storage_dir,
    currentVideoRelPath: row.current_video_rel_path,
    currentMetadataRelPath: row.current_metadata_rel_path,
    manifestStorageRelPath: row.manifest_storage_rel_path,
    versionsStorageDir: row.versions_storage_dir,
  };
}
