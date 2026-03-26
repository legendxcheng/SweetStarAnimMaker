import type {
  ProjectRecord,
  ProjectRepository,
  ResetProjectToPremiseInput,
  UpdateCurrentCharacterSheetBatchInput,
  UpdateCurrentImageBatchInput,
  UpdateCurrentMasterPlotInput,
  UpdateCurrentShotScriptInput,
  UpdateCurrentStoryboardInput,
  UpdateCurrentVideoBatchInput,
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
  current_character_sheet_batch_id: string | null;
  current_storyboard_id: string | null;
  current_shot_script_id: string | null;
  current_image_batch_id: string | null;
  current_video_batch_id: string | null;
  visual_style_text?: string | null;
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
                current_character_sheet_batch_id,
                current_storyboard_id,
                current_shot_script_id,
                current_image_batch_id,
                current_video_batch_id,
                visual_style_text,
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
                @current_character_sheet_batch_id,
                @current_storyboard_id,
                @current_shot_script_id,
                @current_image_batch_id,
                @current_video_batch_id,
                @visual_style_text,
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
              current_master_plot_id,
              current_character_sheet_batch_id,
              current_storyboard_id,
              current_shot_script_id,
              current_image_batch_id,
              current_video_batch_id,
              visual_style_text
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
              @current_character_sheet_batch_id,
              @current_storyboard_id,
              @current_shot_script_id,
              @current_image_batch_id,
              @current_video_batch_id,
              @visual_style_text
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
              current_master_plot_id,
              current_character_sheet_batch_id,
              current_storyboard_id,
              current_shot_script_id,
              current_image_batch_id,
              current_video_batch_id,
              visual_style_text${legacySelectColumns}
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
              current_master_plot_id,
              current_character_sheet_batch_id,
              current_storyboard_id,
              current_shot_script_id,
              current_image_batch_id,
              current_video_batch_id,
              visual_style_text${legacySelectColumns}
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
    updateCurrentCharacterSheetBatch(input) {
      updateCurrentCharacterSheetBatch(options.db, input);
    },
    updateCurrentStoryboard(input) {
      updateCurrentStoryboard(options.db, input);
    },
    updateCurrentShotScript(input) {
      updateCurrentShotScript(options.db, input);
    },
    updateCurrentImageBatch(input) {
      updateCurrentImageBatch(options.db, input);
    },
    updateCurrentVideoBatch(input) {
      updateCurrentVideoBatch(options.db, input);
    },
    updateStatus(input) {
      updateProjectStatus(options.db, input);
    },
    resetToPremise(input) {
      resetProjectToPremise(options.db, input, hasLegacyScriptColumns);
    },
  };
}

function updateCurrentMasterPlot(db: SqliteDatabase, input: UpdateCurrentMasterPlotInput) {
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

function updateCurrentCharacterSheetBatch(
  db: SqliteDatabase,
  input: UpdateCurrentCharacterSheetBatchInput,
) {
  db.prepare(
    `
      UPDATE projects
      SET current_character_sheet_batch_id = @current_character_sheet_batch_id
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    current_character_sheet_batch_id: input.batchId,
  });
}

function updateCurrentStoryboard(db: SqliteDatabase, input: UpdateCurrentStoryboardInput) {
  db.prepare(
    `
      UPDATE projects
      SET current_storyboard_id = @current_storyboard_id
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    current_storyboard_id: input.storyboardId,
  });
}

function updateCurrentShotScript(db: SqliteDatabase, input: UpdateCurrentShotScriptInput) {
  db.prepare(
    `
      UPDATE projects
      SET current_shot_script_id = @current_shot_script_id
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    current_shot_script_id: input.shotScriptId,
  });
}

function updateCurrentImageBatch(db: SqliteDatabase, input: UpdateCurrentImageBatchInput) {
  db.prepare(
    `
      UPDATE projects
      SET current_image_batch_id = @current_image_batch_id
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    current_image_batch_id: input.batchId,
  });
}

function updateCurrentVideoBatch(db: SqliteDatabase, input: UpdateCurrentVideoBatchInput) {
  db.prepare(
    `
      UPDATE projects
      SET current_video_batch_id = @current_video_batch_id
      WHERE id = @project_id
    `,
  ).run({
    project_id: input.projectId,
    current_video_batch_id: input.batchId,
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

function resetProjectToPremise(
  db: SqliteDatabase,
  input: ResetProjectToPremiseInput,
  hasLegacyScriptColumns: boolean,
) {
  const transaction = db.transaction(() => {
    db.prepare(
      `
        DELETE FROM storyboard_reviews
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM shot_script_reviews
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM storyboard_versions
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM character_sheets
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM character_sheet_batches
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM shot_image_frames
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM shot_image_batches
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM segment_videos
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM video_batches
        WHERE project_id = ?
      `,
    ).run(input.projectId);
    db.prepare(
      `
        DELETE FROM tasks
        WHERE project_id = ?
      `,
    ).run(input.projectId);

    const params = {
      project_id: input.projectId,
      premise_bytes: input.premiseBytes,
      updated_at: input.updatedAt,
      premise_updated_at: input.premiseUpdatedAt,
      visual_style_text: input.visualStyleText,
      status: "premise_ready",
      script_bytes: input.premiseBytes,
      script_updated_at: input.premiseUpdatedAt,
    };

    if (hasLegacyScriptColumns) {
      db.prepare(
        `
          UPDATE projects
          SET
            premise_bytes = @premise_bytes,
            updated_at = @updated_at,
            premise_updated_at = @premise_updated_at,
            visual_style_text = @visual_style_text,
            status = @status,
            current_master_plot_id = NULL,
            current_character_sheet_batch_id = NULL,
            current_storyboard_id = NULL,
            current_shot_script_id = NULL,
            current_image_batch_id = NULL,
            current_video_batch_id = NULL,
            script_bytes = @script_bytes,
            script_updated_at = @script_updated_at
          WHERE id = @project_id
        `,
      ).run(params);
      return;
    }

    db.prepare(
      `
        UPDATE projects
        SET
          premise_bytes = @premise_bytes,
          updated_at = @updated_at,
          premise_updated_at = @premise_updated_at,
          visual_style_text = @visual_style_text,
          status = @status,
          current_master_plot_id = NULL,
          current_character_sheet_batch_id = NULL,
          current_storyboard_id = NULL,
          current_shot_script_id = NULL,
          current_image_batch_id = NULL,
          current_video_batch_id = NULL
        WHERE id = @project_id
      `,
    ).run(params);
  });

  transaction();
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
    current_character_sheet_batch_id: project.currentCharacterSheetBatchId,
    current_storyboard_id: project.currentStoryboardId,
    current_shot_script_id: project.currentShotScriptId,
    current_image_batch_id: project.currentImageBatchId,
    current_video_batch_id: project.currentVideoBatchId,
    visual_style_text: project.visualStyleText,
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
    currentCharacterSheetBatchId: row.current_character_sheet_batch_id,
    currentStoryboardId: row.current_storyboard_id,
    currentShotScriptId: row.current_shot_script_id,
    currentImageBatchId: row.current_image_batch_id,
    currentVideoBatchId: row.current_video_batch_id,
    visualStyleText: row.visual_style_text ?? "",
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
    case "premise_ready":
    case "master_plot_generating":
    case "master_plot_in_review":
    case "master_plot_approved":
    case "character_sheets_generating":
    case "character_sheets_in_review":
    case "character_sheets_approved":
    case "storyboard_generating":
    case "storyboard_in_review":
    case "storyboard_approved":
    case "shot_script_generating":
    case "shot_script_in_review":
    case "shot_script_approved":
    case "images_generating":
    case "images_in_review":
    case "images_approved":
    case "videos_generating":
    case "videos_in_review":
    case "videos_approved":
      return status;
    default:
      throw new Error(`Unknown project status in sqlite storage: ${status}`);
  }
}
