import type {
  SceneSheetBatchRecord,
  SceneSheetRecordEntity,
  SceneSheetRepository,
} from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

export interface CreateSqliteSceneSheetRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteSceneSheetRepository(
  options: CreateSqliteSceneSheetRepositoryOptions,
): SceneSheetRepository {
  return {
    insertBatch(batch) {
      options.db
        .prepare(
          `
            INSERT INTO scene_sheet_batches (
              id,
              project_id,
              project_storage_dir,
              source_master_plot_id,
              source_character_sheet_batch_id,
              scene_count,
              storage_dir,
              manifest_rel_path,
              created_at,
              updated_at
            ) VALUES (
              @id,
              @project_id,
              @project_storage_dir,
              @source_master_plot_id,
              @source_character_sheet_batch_id,
              @scene_count,
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
        .prepare("SELECT * FROM scene_sheet_batches WHERE id = ?")
        .get(batchId) as SceneSheetBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
    listScenesByBatchId(batchId) {
      const rows = options.db
        .prepare("SELECT * FROM scene_sheets WHERE batch_id = ? ORDER BY scene_name ASC")
        .all(batchId) as SceneSheetRow[];

      return rows.map(fromSceneRow);
    },
    insertScene(scene) {
      options.db
        .prepare(
          `
            INSERT INTO scene_sheets (
              id,
              project_id,
              project_storage_dir,
              batch_id,
              source_master_plot_id,
              source_character_sheet_batch_id,
              scene_name,
              scene_purpose,
              prompt_text_generated,
              prompt_text_current,
              constraints_text,
              image_asset_path,
              image_width,
              image_height,
              provider,
              model,
              status,
              updated_at,
              approved_at,
              source_task_id,
              storage_dir,
              current_image_rel_path,
              current_metadata_rel_path,
              prompt_generated_rel_path,
              prompt_current_rel_path,
              prompt_variables_rel_path,
              image_prompt_rel_path,
              versions_storage_dir
            ) VALUES (
              @id,
              @project_id,
              @project_storage_dir,
              @batch_id,
              @source_master_plot_id,
              @source_character_sheet_batch_id,
              @scene_name,
              @scene_purpose,
              @prompt_text_generated,
              @prompt_text_current,
              @constraints_text,
              @image_asset_path,
              @image_width,
              @image_height,
              @provider,
              @model,
              @status,
              @updated_at,
              @approved_at,
              @source_task_id,
              @storage_dir,
              @current_image_rel_path,
              @current_metadata_rel_path,
              @prompt_generated_rel_path,
              @prompt_current_rel_path,
              @prompt_variables_rel_path,
              @image_prompt_rel_path,
              @versions_storage_dir
            )
          `,
        )
        .run(toSceneRow(scene));
    },
    findSceneById(sceneId) {
      const row = options.db
        .prepare("SELECT * FROM scene_sheets WHERE id = ?")
        .get(sceneId) as SceneSheetRow | undefined;

      return row ? fromSceneRow(row) : null;
    },
    updateScene(scene) {
      options.db
        .prepare(
          `
            UPDATE scene_sheets
            SET
              prompt_text_generated = @prompt_text_generated,
              prompt_text_current = @prompt_text_current,
              constraints_text = @constraints_text,
              image_asset_path = @image_asset_path,
              image_width = @image_width,
              image_height = @image_height,
              provider = @provider,
              model = @model,
              status = @status,
              updated_at = @updated_at,
              approved_at = @approved_at,
              source_task_id = @source_task_id,
              storage_dir = @storage_dir,
              current_image_rel_path = @current_image_rel_path,
              current_metadata_rel_path = @current_metadata_rel_path,
              prompt_generated_rel_path = @prompt_generated_rel_path,
              prompt_current_rel_path = @prompt_current_rel_path,
              prompt_variables_rel_path = @prompt_variables_rel_path,
              image_prompt_rel_path = @image_prompt_rel_path,
              versions_storage_dir = @versions_storage_dir
            WHERE id = @id
          `,
        )
        .run(toSceneRow(scene));
    },
  };
}

interface SceneSheetBatchRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_master_plot_id: string;
  source_character_sheet_batch_id: string;
  scene_count: number;
  storage_dir: string;
  manifest_rel_path: string;
  created_at: string;
  updated_at: string;
}

interface SceneSheetRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  batch_id: string;
  source_master_plot_id: string;
  source_character_sheet_batch_id: string;
  scene_name: string;
  scene_purpose: string;
  prompt_text_generated: string;
  prompt_text_current: string;
  constraints_text: string;
  image_asset_path: string | null;
  image_width: number | null;
  image_height: number | null;
  provider: string | null;
  model: string | null;
  status: SceneSheetRecordEntity["status"];
  updated_at: string;
  approved_at: string | null;
  source_task_id: string | null;
  storage_dir: string;
  current_image_rel_path: string;
  current_metadata_rel_path: string;
  prompt_generated_rel_path: string;
  prompt_current_rel_path: string;
  prompt_variables_rel_path: string;
  image_prompt_rel_path: string;
  versions_storage_dir: string;
}

function toBatchRow(batch: SceneSheetBatchRecord): SceneSheetBatchRow {
  return {
    id: batch.id,
    project_id: batch.projectId,
    project_storage_dir: batch.projectStorageDir,
    source_master_plot_id: batch.sourceMasterPlotId,
    source_character_sheet_batch_id: batch.sourceCharacterSheetBatchId,
    scene_count: batch.sceneCount,
    storage_dir: batch.storageDir,
    manifest_rel_path: batch.manifestRelPath,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

function fromBatchRow(row: SceneSheetBatchRow): SceneSheetBatchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceMasterPlotId: row.source_master_plot_id,
    sourceCharacterSheetBatchId: row.source_character_sheet_batch_id,
    sceneCount: row.scene_count,
    storageDir: row.storage_dir,
    manifestRelPath: row.manifest_rel_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSceneRow(scene: SceneSheetRecordEntity): SceneSheetRow {
  return {
    id: scene.id,
    project_id: scene.projectId,
    project_storage_dir: scene.projectStorageDir,
    batch_id: scene.batchId,
    source_master_plot_id: scene.sourceMasterPlotId,
    source_character_sheet_batch_id: scene.sourceCharacterSheetBatchId,
    scene_name: scene.sceneName,
    scene_purpose: scene.scenePurpose,
    prompt_text_generated: scene.promptTextGenerated,
    prompt_text_current: scene.promptTextCurrent,
    constraints_text: scene.constraintsText,
    image_asset_path: scene.imageAssetPath,
    image_width: scene.imageWidth,
    image_height: scene.imageHeight,
    provider: scene.provider,
    model: scene.model,
    status: scene.status,
    updated_at: scene.updatedAt,
    approved_at: scene.approvedAt,
    source_task_id: scene.sourceTaskId,
    storage_dir: scene.storageDir,
    current_image_rel_path: scene.currentImageRelPath,
    current_metadata_rel_path: scene.currentMetadataRelPath,
    prompt_generated_rel_path: scene.promptGeneratedRelPath,
    prompt_current_rel_path: scene.promptCurrentRelPath,
    prompt_variables_rel_path: scene.promptVariablesRelPath,
    image_prompt_rel_path: scene.imagePromptRelPath,
    versions_storage_dir: scene.versionsStorageDir,
  };
}

function fromSceneRow(row: SceneSheetRow): SceneSheetRecordEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    batchId: row.batch_id,
    sourceMasterPlotId: row.source_master_plot_id,
    sourceCharacterSheetBatchId: row.source_character_sheet_batch_id,
    sceneName: row.scene_name,
    scenePurpose: row.scene_purpose,
    promptTextGenerated: row.prompt_text_generated,
    promptTextCurrent: row.prompt_text_current,
    constraintsText: row.constraints_text,
    imageAssetPath: row.image_asset_path,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    provider: row.provider,
    model: row.model,
    status: row.status,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    sourceTaskId: row.source_task_id,
    storageDir: row.storage_dir,
    currentImageRelPath: row.current_image_rel_path,
    currentMetadataRelPath: row.current_metadata_rel_path,
    promptGeneratedRelPath: row.prompt_generated_rel_path,
    promptCurrentRelPath: row.prompt_current_rel_path,
    promptVariablesRelPath: row.prompt_variables_rel_path,
    imagePromptRelPath: row.image_prompt_rel_path,
    versionsStorageDir: row.versions_storage_dir,
  };
}
