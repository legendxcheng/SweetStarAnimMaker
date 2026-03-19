import type { MasterPlotReviewSummary, StoryboardReviewRepository } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

interface SqliteStoryboardReviewRow {
  id: string;
  project_id: string;
  master_plot_id: string;
  action: MasterPlotReviewSummary["action"];
  reason: string | null;
  triggered_task_id: string | null;
  created_at: string;
}

export interface CreateSqliteStoryboardReviewRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteStoryboardReviewRepository(
  options: CreateSqliteStoryboardReviewRepositoryOptions,
): StoryboardReviewRepository {
  return {
    insert(review) {
      options.db
        .prepare(
          `
            INSERT INTO storyboard_reviews (
              id,
              project_id,
              master_plot_id,
              action,
              reason,
              triggered_task_id,
              created_at
            ) VALUES (
              @id,
              @project_id,
              @master_plot_id,
              @action,
              @reason,
              @triggered_task_id,
              @created_at
            )
          `,
        )
        .run({
          id: review.id,
          project_id: review.projectId,
          master_plot_id: review.masterPlotId,
          action: review.action,
          reason: review.reason,
          triggered_task_id: review.triggeredTaskId,
          created_at: review.createdAt,
        });
    },
    findLatestByProjectId(projectId) {
      const row = options.db
        .prepare(
          `
            SELECT
              id,
              project_id,
              master_plot_id,
              action,
              reason,
              triggered_task_id,
              created_at
            FROM storyboard_reviews
            WHERE project_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          `,
        )
        .get(projectId) as SqliteStoryboardReviewRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
  };
}

function fromSqliteRow(row: SqliteStoryboardReviewRow): MasterPlotReviewSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    masterPlotId: row.master_plot_id,
    action: row.action,
    reason: row.reason,
    triggeredTaskId: row.triggered_task_id,
    createdAt: row.created_at,
  };
}
