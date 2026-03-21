import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteCharacterSheetSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_sheet_batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      source_master_plot_id TEXT NOT NULL,
      character_count INTEGER NOT NULL,
      storage_dir TEXT NOT NULL,
      manifest_rel_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS character_sheets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      source_master_plot_id TEXT NOT NULL,
      character_name TEXT NOT NULL,
      prompt_text_generated TEXT NOT NULL,
      prompt_text_current TEXT NOT NULL,
      image_asset_path TEXT NULL,
      image_width INTEGER NULL,
      image_height INTEGER NULL,
      provider TEXT NULL,
      model TEXT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      approved_at TEXT NULL,
      source_task_id TEXT NULL,
      storage_dir TEXT NOT NULL,
      current_image_rel_path TEXT NOT NULL,
      current_metadata_rel_path TEXT NOT NULL,
      prompt_generated_rel_path TEXT NOT NULL,
      prompt_current_rel_path TEXT NOT NULL,
      prompt_variables_rel_path TEXT NOT NULL,
      image_prompt_rel_path TEXT NOT NULL,
      versions_storage_dir TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(batch_id) REFERENCES character_sheet_batches(id)
    )
  `);
}
