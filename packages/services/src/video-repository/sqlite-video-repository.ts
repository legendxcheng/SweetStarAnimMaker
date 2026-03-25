import type {
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
              segment_count, storage_dir, manifest_rel_path, created_at, updated_at
            ) VALUES (
              @id, @project_id, @project_storage_dir, @source_image_batch_id, @source_shot_script_id,
              @segment_count, @storage_dir, @manifest_rel_path, @created_at, @updated_at
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
            ORDER BY segment_order ASC
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
              segment_id, scene_id, segment_order, status, video_asset_path, thumbnail_asset_path,
              duration_sec, provider, model, updated_at, approved_at, source_task_id, storage_dir,
              current_video_rel_path, current_metadata_rel_path, thumbnail_rel_path, versions_storage_dir
            ) VALUES (
              @id, @batch_id, @project_id, @project_storage_dir, @source_image_batch_id, @source_shot_script_id,
              @segment_id, @scene_id, @segment_order, @status, @video_asset_path, @thumbnail_asset_path,
              @duration_sec, @provider, @model, @updated_at, @approved_at, @source_task_id, @storage_dir,
              @current_video_rel_path, @current_metadata_rel_path, @thumbnail_rel_path, @versions_storage_dir
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
          `,
        )
        .get(projectId, segmentId) as SegmentVideoRow | undefined;

      return row ? fromSegmentRow(row) : null;
    },
    updateSegment(segment) {
      options.db
        .prepare(
          `
            UPDATE segment_videos
            SET
              status = @status,
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
  };
}

interface VideoBatchRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_image_batch_id: string;
  source_shot_script_id: string;
  segment_count: number;
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
  segment_id: string;
  scene_id: string;
  segment_order: number;
  status: SegmentVideoRecordEntity["status"];
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

function toBatchRow(batch: VideoBatchRecord): VideoBatchRow {
  return {
    id: batch.id,
    project_id: batch.projectId,
    project_storage_dir: batch.projectStorageDir,
    source_image_batch_id: batch.sourceImageBatchId,
    source_shot_script_id: batch.sourceShotScriptId,
    segment_count: batch.segmentCount,
    storage_dir: batch.storageDir,
    manifest_rel_path: batch.manifestRelPath,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

function fromBatchRow(row: VideoBatchRow): VideoBatchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceImageBatchId: row.source_image_batch_id,
    sourceShotScriptId: row.source_shot_script_id,
    segmentCount: row.segment_count,
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
    segment_id: segment.segmentId,
    scene_id: segment.sceneId,
    segment_order: segment.order,
    status: segment.status,
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
    segmentId: row.segment_id,
    sceneId: row.scene_id,
    order: row.segment_order,
    status: row.status,
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
