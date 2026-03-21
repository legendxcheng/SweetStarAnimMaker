import type {
  CharacterSheetBatchRecord,
  CharacterSheetRecordEntity,
  CharacterSheetRepository,
} from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

export interface CreateSqliteCharacterSheetRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteCharacterSheetRepository(
  options: CreateSqliteCharacterSheetRepositoryOptions,
): CharacterSheetRepository {
  return {
    insertBatch(batch) {
      options.db
        .prepare(
          `
            INSERT INTO character_sheet_batches (
              id,
              project_id,
              project_storage_dir,
              source_master_plot_id,
              character_count,
              storage_dir,
              manifest_rel_path,
              created_at,
              updated_at
            ) VALUES (
              @id,
              @project_id,
              @project_storage_dir,
              @source_master_plot_id,
              @character_count,
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
        .prepare("SELECT * FROM character_sheet_batches WHERE id = ?")
        .get(batchId) as CharacterSheetBatchRow | undefined;

      return row ? fromBatchRow(row) : null;
    },
    listCharactersByBatchId(batchId) {
      const rows = options.db
        .prepare("SELECT * FROM character_sheets WHERE batch_id = ? ORDER BY character_name ASC")
        .all(batchId) as CharacterSheetRow[];

      return rows.map(fromCharacterRow);
    },
    insertCharacter(character) {
      options.db
        .prepare(
          `
            INSERT INTO character_sheets (
              id,
              project_id,
              project_storage_dir,
              batch_id,
              source_master_plot_id,
              character_name,
              prompt_text_generated,
              prompt_text_current,
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
              @character_name,
              @prompt_text_generated,
              @prompt_text_current,
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
        .run(toCharacterRow(character));
    },
    findCharacterById(characterId) {
      const row = options.db
        .prepare("SELECT * FROM character_sheets WHERE id = ?")
        .get(characterId) as CharacterSheetRow | undefined;

      return row ? fromCharacterRow(row) : null;
    },
    updateCharacter(character) {
      options.db
        .prepare(
          `
            UPDATE character_sheets
            SET
              prompt_text_generated = @prompt_text_generated,
              prompt_text_current = @prompt_text_current,
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
        .run(toCharacterRow(character));
    },
  };
}

interface CharacterSheetBatchRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_master_plot_id: string;
  character_count: number;
  storage_dir: string;
  manifest_rel_path: string;
  created_at: string;
  updated_at: string;
}

interface CharacterSheetRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  batch_id: string;
  source_master_plot_id: string;
  character_name: string;
  prompt_text_generated: string;
  prompt_text_current: string;
  image_asset_path: string | null;
  image_width: number | null;
  image_height: number | null;
  provider: string | null;
  model: string | null;
  status: CharacterSheetRecordEntity["status"];
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

function toBatchRow(batch: CharacterSheetBatchRecord): CharacterSheetBatchRow {
  return {
    id: batch.id,
    project_id: batch.projectId,
    project_storage_dir: batch.projectStorageDir,
    source_master_plot_id: batch.sourceMasterPlotId,
    character_count: batch.characterCount,
    storage_dir: batch.storageDir,
    manifest_rel_path: batch.manifestRelPath,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

function fromBatchRow(row: CharacterSheetBatchRow): CharacterSheetBatchRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceMasterPlotId: row.source_master_plot_id,
    characterCount: row.character_count,
    storageDir: row.storage_dir,
    manifestRelPath: row.manifest_rel_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCharacterRow(character: CharacterSheetRecordEntity): CharacterSheetRow {
  return {
    id: character.id,
    project_id: character.projectId,
    project_storage_dir: character.projectStorageDir,
    batch_id: character.batchId,
    source_master_plot_id: character.sourceMasterPlotId,
    character_name: character.characterName,
    prompt_text_generated: character.promptTextGenerated,
    prompt_text_current: character.promptTextCurrent,
    image_asset_path: character.imageAssetPath,
    image_width: character.imageWidth,
    image_height: character.imageHeight,
    provider: character.provider,
    model: character.model,
    status: character.status,
    updated_at: character.updatedAt,
    approved_at: character.approvedAt,
    source_task_id: character.sourceTaskId,
    storage_dir: character.storageDir,
    current_image_rel_path: character.currentImageRelPath,
    current_metadata_rel_path: character.currentMetadataRelPath,
    prompt_generated_rel_path: character.promptGeneratedRelPath,
    prompt_current_rel_path: character.promptCurrentRelPath,
    prompt_variables_rel_path: character.promptVariablesRelPath,
    image_prompt_rel_path: character.imagePromptRelPath,
    versions_storage_dir: character.versionsStorageDir,
  };
}

function fromCharacterRow(row: CharacterSheetRow): CharacterSheetRecordEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    batchId: row.batch_id,
    sourceMasterPlotId: row.source_master_plot_id,
    characterName: row.character_name,
    promptTextGenerated: row.prompt_text_generated,
    promptTextCurrent: row.prompt_text_current,
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
