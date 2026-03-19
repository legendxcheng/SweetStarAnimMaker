import type { StoryboardVersionRecord, StoryboardVersionRepository } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

interface SqliteStoryboardVersionRow {
  id: string;
  project_id: string;
  project_storage_dir: string;
  source_task_id: string;
  version_number: number;
  kind: StoryboardVersionRecord["kind"];
  provider: string;
  model: string;
  file_rel_path: string;
  raw_response_rel_path: string;
  created_at: string;
}

export interface CreateSqliteStoryboardVersionRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteStoryboardVersionRepository(
  options: CreateSqliteStoryboardVersionRepositoryOptions,
): StoryboardVersionRepository {
  return {
    insert(version) {
      options.db
        .prepare(
          `
            INSERT INTO storyboard_versions (
              id,
              project_id,
              source_task_id,
              version_number,
              kind,
              provider,
              model,
              file_rel_path,
              raw_response_rel_path,
              created_at
            ) VALUES (
              @id,
              @project_id,
              @source_task_id,
              @version_number,
              @kind,
              @provider,
              @model,
              @file_rel_path,
              @raw_response_rel_path,
              @created_at
            )
          `,
        )
        .run({
          id: version.id,
          project_id: version.projectId,
          source_task_id: version.sourceTaskId,
          version_number: version.versionNumber,
          kind: version.kind,
          provider: version.provider,
          model: version.model,
          file_rel_path: version.fileRelPath,
          raw_response_rel_path: version.rawResponseRelPath,
          created_at: version.createdAt,
        });
    },
    findCurrentByProjectId(projectId) {
      const row = options.db
        .prepare(
          `
            SELECT
              sv.id,
              sv.project_id,
              p.storage_dir AS project_storage_dir,
              sv.source_task_id,
              sv.version_number,
              sv.kind,
              sv.provider,
              sv.model,
              sv.file_rel_path,
              sv.raw_response_rel_path,
              sv.created_at
            FROM projects p
            JOIN storyboard_versions sv
              ON sv.id = p.current_master_plot_id
            WHERE p.id = ?
          `,
        )
        .get(projectId) as SqliteStoryboardVersionRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
    findById(storyboardVersionId) {
      const row = options.db
        .prepare(
          `
            SELECT
              sv.id,
              sv.project_id,
              p.storage_dir AS project_storage_dir,
              sv.source_task_id,
              sv.version_number,
              sv.kind,
              sv.provider,
              sv.model,
              sv.file_rel_path,
              sv.raw_response_rel_path,
              sv.created_at
            FROM storyboard_versions sv
            JOIN projects p
              ON p.id = sv.project_id
            WHERE sv.id = ?
          `,
        )
        .get(storyboardVersionId) as SqliteStoryboardVersionRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
    getNextVersionNumber(projectId) {
      const row = options.db
        .prepare(
          `
            SELECT COALESCE(MAX(version_number), 0) AS max_version
            FROM storyboard_versions
            WHERE project_id = ?
          `,
        )
        .get(projectId) as { max_version: number };

      return row.max_version + 1;
    },
  };
}

function fromSqliteRow(row: SqliteStoryboardVersionRow): StoryboardVersionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectStorageDir: row.project_storage_dir,
    sourceTaskId: row.source_task_id,
    versionNumber: row.version_number,
    kind: row.kind,
    provider: row.provider,
    model: row.model,
    storageDir: `${row.project_storage_dir}/storyboards/versions`,
    fileRelPath: row.file_rel_path,
    rawResponseRelPath: row.raw_response_rel_path,
    createdAt: row.created_at,
  };
}
