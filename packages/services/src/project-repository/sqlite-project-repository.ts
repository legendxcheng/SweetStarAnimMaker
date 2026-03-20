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
  premise_rel_path: string | null;
  premise_bytes: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  premise_updated_at: string | null;
  current_master_plot_id: string | null;
  script_rel_path?: string | null;
  script_bytes?: number | null;
  script_updated_at?: string | null;
}

export interface CreateSqliteProjectRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteProjectRepository(
  options: CreateSqliteProjectRepositoryOptions,
): ProjectRepository {
  const projectColumns = getProjectsColumnSet(options.db);
  const hasLegacyScriptColumns =
    projectColumns.has("script_rel_path") &&
    projectColumns.has("script_bytes") &&
    projectColumns.has("script_updated_at");
  const legacySelectColumns = hasLegacyScriptColumns
    ? `,
              script_rel_path,
              script_bytes,
              script_updated_at`
    : "";

  return {
    insert(project) {
      const row = toSqliteRow(project);

      if (hasLegacyScriptColumns) {
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
                current_master_plot_id,
                script_rel_path,
                script_bytes,
                script_updated_at
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
                @current_master_plot_id,
                @script_rel_path,
                @script_bytes,
                @script_updated_at
              )
            `,
          )
          .run(row);
        return;
      }

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
        .run(row);
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
              current_master_plot_id${legacySelectColumns}
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
              current_master_plot_id${legacySelectColumns}
            FROM projects
            ORDER BY updated_at DESC
          `,
        )
        .all() as SqliteProjectRow[];

      return rows.map(fromSqliteRow);
    },
    updatePremiseMetadata(input) {
      const updateParams = {
        id: input.id,
        premise_bytes: input.premiseBytes,
        updated_at: input.updatedAt,
        premise_updated_at: input.premiseUpdatedAt,
        script_bytes: input.premiseBytes,
        script_updated_at: input.premiseUpdatedAt,
      };

      if (hasLegacyScriptColumns) {
        options.db
          .prepare(
            `
              UPDATE projects
              SET
                premise_bytes = @premise_bytes,
                updated_at = @updated_at,
                premise_updated_at = @premise_updated_at,
                script_bytes = @script_bytes,
                script_updated_at = @script_updated_at
              WHERE id = @id
            `,
          )
          .run(updateParams);
        return;
      }

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
        .run(updateParams);
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
    script_rel_path: project.premiseRelPath,
    script_bytes: project.premiseBytes,
    script_updated_at: project.premiseUpdatedAt,
  };
}

function fromSqliteRow(row: SqliteProjectRow): ProjectRecord {
  const premiseRelPath = row.premise_rel_path ?? row.script_rel_path;
  const premiseBytes = row.premise_bytes ?? row.script_bytes;
  const premiseUpdatedAt = row.premise_updated_at ?? row.script_updated_at;

  if (!premiseRelPath || premiseBytes === null || premiseBytes === undefined || !premiseUpdatedAt) {
    throw new Error(`Project row ${row.id} is missing premise metadata`);
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    storageDir: row.storage_dir,
    premiseRelPath,
    premiseBytes,
    currentMasterPlotId: row.current_master_plot_id,
    status: normalizeProjectStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    premiseUpdatedAt,
  };
}

function getProjectsColumnSet(db: SqliteDatabase) {
  const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  return new Set(columns.map((column) => column.name));
}

function normalizeProjectStatus(status: string): ProjectRecord["status"] {
  switch (status) {
    case "script_ready":
      return "premise_ready";
    case "storyboard_generating":
      return "master_plot_generating";
    case "storyboard_in_review":
      return "master_plot_in_review";
    case "storyboard_approved":
      return "master_plot_approved";
    case "premise_ready":
    case "master_plot_generating":
    case "master_plot_in_review":
    case "master_plot_approved":
      return status;
    default:
      throw new Error(`Unknown project status in sqlite storage: ${status}`);
  }
}
