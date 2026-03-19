import type {
  ProjectRecord,
  ProjectRepository,
  UpdateCurrentMasterPlotInput,
  UpdateProjectStatusInput,
} from "@sweet-star/core";

import type { SqliteDatabase } from "./sqlite-db";

interface SqliteProjectRow {
  id: string;
  name: string;
  slug: string;
  storage_dir: string;
  premise_rel_path: string;
  premise_bytes: number;
  status: ProjectRecord["status"];
  created_at: string;
  updated_at: string;
  premise_updated_at: string;
  current_master_plot_id: string | null;
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
              premise_rel_path,
              premise_bytes,
              status,
              created_at,
              updated_at,
              premise_updated_at,
              current_master_plot_id
            ) VALUES (
              @id,
              @name,
              @slug,
              @storage_dir,
              @premise_rel_path,
              @premise_bytes,
              @status,
              @created_at,
              @updated_at,
              @premise_updated_at,
              @current_master_plot_id
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
              premise_rel_path,
              premise_bytes,
              status,
              created_at,
              updated_at,
              premise_updated_at,
              current_master_plot_id
            FROM projects
            WHERE id = ?
          `,
        )
        .get(projectId) as SqliteProjectRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
    listAll() {
      const rows = options.db
        .prepare(
          `
            SELECT
              id,
              name,
              slug,
              storage_dir,
              premise_rel_path,
              premise_bytes,
              status,
              created_at,
              updated_at,
              premise_updated_at,
              current_master_plot_id
            FROM projects
            ORDER BY updated_at DESC
          `,
        )
        .all() as SqliteProjectRow[];

      return rows.map(fromSqliteRow);
    },
    updatePremiseMetadata(input) {
      options.db
        .prepare(
          `
            UPDATE projects
            SET
              premise_bytes = @premise_bytes,
              updated_at = @updated_at,
              premise_updated_at = @premise_updated_at
            WHERE id = @id
          `,
        )
        .run({
          id: input.id,
          premise_bytes: input.premiseBytes,
          updated_at: input.updatedAt,
          premise_updated_at: input.premiseUpdatedAt,
        });
    },
    updateCurrentMasterPlot(input) {
      updateCurrentMasterPlot(options.db, input);
    },
    updateStatus(input) {
      updateProjectStatus(options.db, input);
    },
  };
}

function updateCurrentMasterPlot(
  db: SqliteDatabase,
  input: UpdateCurrentMasterPlotInput,
) {
  db.prepare(
    `
      UPDATE projects
      SET current_master_plot_id = @current_master_plot_id
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    current_master_plot_id: input.masterPlotId,
  });
}

function updateProjectStatus(db: SqliteDatabase, input: UpdateProjectStatusInput) {
  db.prepare(
    `
      UPDATE projects
      SET
        status = @status,
        updated_at = @updated_at
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    status: input.status,
    updated_at: input.updatedAt,
  });
}

function toSqliteRow(project: ProjectRecord): SqliteProjectRow {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    storage_dir: project.storageDir,
    premise_rel_path: project.premiseRelPath,
    premise_bytes: project.premiseBytes,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    premise_updated_at: project.premiseUpdatedAt,
    current_master_plot_id: project.currentMasterPlotId,
  };
}

function fromSqliteRow(row: SqliteProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    storageDir: row.storage_dir,
    premiseRelPath: row.premise_rel_path,
    premiseBytes: row.premise_bytes,
    currentMasterPlotId: row.current_master_plot_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    premiseUpdatedAt: row.premise_updated_at,
  };
}
