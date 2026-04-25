import type {
  SegmentFrameRecordEntity,
  ShotImageBatchRecord,
  ShotReferenceFrameEntity,
  ShotReferenceRecordEntity,
} from "@sweet-star/core";

export interface ShotImageBatchRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_shot_script_id: string;
  segment_count: number;
  shot_count: number;
  total_frame_count: number;
  total_required_frame_count: number;
  storage_dir: string;
  manifest_rel_path: string;
  created_at: string;
  updated_at: string;
}

export interface ShotImageShotRow {
  id: string;
  batch_id: string;
  project_id: string;
  project_storage_dir: string;
  source_shot_script_id: string;
  scene_id: string;
  segment_id: string;
  shot_id: string;
  shot_code: string;
  segment_order: number;
  segment_name: string | null;
  segment_summary: string;
  source_shot_ids_json: string;
  shot_order: number;
  duration_sec: number | null;
  frame_dependency: ShotReferenceRecordEntity["frameDependency"];
  status: ShotReferenceRecordEntity["status"];
  reference_status: ShotReferenceRecordEntity["referenceStatus"];
  approved_at: string | null;
  updated_at: string;
  storage_dir: string;
  manifest_rel_path: string;
  start_frame_json: string;
  end_frame_json: string | null;
}

export interface ShotImageFrameRow {
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

export function toBatchRow(batch: ShotImageBatchRecord): ShotImageBatchRow {
  return {
    id: batch.id,
    project_id: batch.projectId,
    project_storage_dir: batch.projectStorageDir,
    source_shot_script_id: batch.sourceShotScriptId,
    segment_count: batch.segmentCount,
    shot_count: batch.shotCount,
    total_frame_count: batch.totalFrameCount,
    total_required_frame_count: batch.totalRequiredFrameCount,
    storage_dir: batch.storageDir,
    manifest_rel_path: batch.manifestRelPath,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

export function fromBatchRow(row: ShotImageBatchRow): ShotImageBatchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceShotScriptId: row.source_shot_script_id,
    segmentCount: row.segment_count,
    shotCount: row.shot_count,
    totalFrameCount: row.total_frame_count,
    totalRequiredFrameCount: row.total_required_frame_count,
    storageDir: row.storage_dir,
    manifestRelPath: row.manifest_rel_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toFrameRow(frame: SegmentFrameRecordEntity): ShotImageFrameRow {
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

export function fromFrameRow(row: ShotImageFrameRow): SegmentFrameRecordEntity {
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
    selectedSceneId: null,
    selectedSceneName: null,
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

export function toShotRow(shot: ShotReferenceRecordEntity): ShotImageShotRow {
  return {
    id: shot.id,
    batch_id: shot.batchId,
    project_id: shot.projectId,
    project_storage_dir: shot.projectStorageDir,
    source_shot_script_id: shot.sourceShotScriptId,
    scene_id: shot.sceneId,
    segment_id: shot.segmentId,
    shot_id: shot.shotId ?? "",
    shot_code: shot.shotCode ?? "",
    segment_order: shot.segmentOrder,
    segment_name: shot.segmentName ?? null,
    segment_summary: shot.segmentSummary ?? "",
    source_shot_ids_json: JSON.stringify(shot.sourceShotIds ?? []),
    shot_order: shot.shotOrder ?? 0,
    duration_sec: shot.durationSec ?? null,
    frame_dependency: shot.frameDependency,
    status: shot.status,
    reference_status: shot.referenceStatus,
    approved_at: shot.approvedAt,
    updated_at: shot.updatedAt,
    storage_dir: shot.storageDir,
    manifest_rel_path: shot.manifestRelPath,
    start_frame_json: JSON.stringify(shot.startFrame),
    end_frame_json: shot.endFrame ? JSON.stringify(shot.endFrame) : null,
  };
}

export function fromShotRow(row: ShotImageShotRow): ShotReferenceRecordEntity {
  const baseShot = {
    id: row.id,
    batchId: row.batch_id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceShotScriptId: row.source_shot_script_id,
    sceneId: row.scene_id,
    segmentId: row.segment_id,
    shotId: row.shot_id,
    shotCode: row.shot_code,
    segmentOrder: row.segment_order,
    segmentName: row.segment_name,
    segmentSummary: row.segment_summary,
    sourceShotIds: parseJsonArray<string>(row.source_shot_ids_json),
    shotOrder: row.shot_order,
    durationSec: row.duration_sec,
    frameDependency: row.frame_dependency,
    status: row.status,
    referenceStatus: row.reference_status,
    approvedAt: row.approved_at,
    updatedAt: row.updated_at,
    storageDir: row.storage_dir,
    manifestRelPath: row.manifest_rel_path,
    startFrame: JSON.parse(row.start_frame_json) as ShotReferenceFrameEntity,
  };

  if (row.frame_dependency === "start_and_end_frame") {
    return {
      ...baseShot,
      frameDependency: "start_and_end_frame",
      endFrame: JSON.parse(row.end_frame_json ?? "null") as ShotReferenceFrameEntity,
    };
  }

  return {
    ...baseShot,
    frameDependency: "start_frame_only",
    endFrame: null,
  };
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
