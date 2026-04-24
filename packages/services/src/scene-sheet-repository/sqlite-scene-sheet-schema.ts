import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteSceneSheetSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scene_sheet_batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      source_master_plot_id TEXT NOT NULL,
      source_character_sheet_batch_id TEXT NOT NULL,
      scene_count INTEGER NOT NULL,
      storage_dir TEXT NOT NULL,
      manifest_rel_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scene_sheets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      source_master_plot_id TEXT NOT NULL,
      source_character_sheet_batch_id TEXT NOT NULL,
      scene_name TEXT NOT NULL,
      scene_purpose TEXT NOT NULL,
      prompt_text_generated TEXT NOT NULL,
      prompt_text_current TEXT NOT NULL,
      constraints_text TEXT NOT NULL,
      image_asset_path TEXT,
      image_width INTEGER,
      image_height INTEGER,
      provider TEXT,
      model TEXT,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      approved_at TEXT,
      source_task_id TEXT,
      storage_dir TEXT NOT NULL,
      current_image_rel_path TEXT NOT NULL,
      current_metadata_rel_path TEXT NOT NULL,
      prompt_generated_rel_path TEXT NOT NULL,
      prompt_current_rel_path TEXT NOT NULL,
      prompt_variables_rel_path TEXT NOT NULL,
      image_prompt_rel_path TEXT NOT NULL,
      versions_storage_dir TEXT NOT NULL
    );
  `);
}
