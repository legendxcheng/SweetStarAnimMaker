import type { ProjectRecord, ProjectRepository, UpdateProjectScriptMetadataInput } from "@sweet-star/core";

import type { SqliteDatabase } from "./sqlite-db";

interface SqliteProjectRow {
  id: string;
  name: string;
  slug: string;
  storage_dir: string;
  script_rel_path: string;
  script_bytes: number;
  status: ProjectRecord["status"];
  created_at: string;
  updated_at: string;
  script_updated_at: string;
}

export interface CreateSqliteProjectRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteProjectRepository(
  options: CreateSqliteProjectRepositoryOptions,
): ProjectRepository {
  return {
    insert(project) {
      options.db
        .prepare(
          `
            INSERT INTO projects (
              id,
              name,
              slug,
              storage_dir,
              script_rel_path,
              script_bytes,
              status,
              created_at,
              updated_at,
              script_updated_at
            ) VALUES (
              @id,
              @name,
              @slug,
              @storage_dir,
              @script_rel_path,
              @script_bytes,
              @status,
              @created_at,
              @updated_at,
              @script_updated_at
            )
          `,
        )
        .run(toSqliteRow(project));
    },
    findById(projectId) {
      const row = options.db
        .prepare(
          `
            SELECT
              id,
              name,
              slug,
              storage_dir,
              script_rel_path,
              script_bytes,
              status,
              created_at,
              updated_at,
              script_updated_at
            FROM projects
            WHERE id = ?
          `,
        )
        .get(projectId) as SqliteProjectRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
    updateScriptMetadata(input) {
      options.db
        .prepare(
          `
            UPDATE projects
            SET
              script_bytes = @script_bytes,
              updated_at = @updated_at,
              script_updated_at = @script_updated_at
            WHERE id = @id
          `,
        )
        .run({
          id: input.id,
          script_bytes: input.scriptBytes,
          updated_at: input.updatedAt,
          script_updated_at: input.scriptUpdatedAt,
        });
    },
  };
}

function toSqliteRow(project: ProjectRecord): SqliteProjectRow {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    storage_dir: project.storageDir,
    script_rel_path: project.scriptRelPath,
    script_bytes: project.scriptBytes,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    script_updated_at: project.scriptUpdatedAt,
  };
}

function fromSqliteRow(row: SqliteProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    storageDir: row.storage_dir,
    scriptRelPath: row.script_rel_path,
    scriptBytes: row.script_bytes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scriptUpdatedAt: row.script_updated_at,
  };
}
