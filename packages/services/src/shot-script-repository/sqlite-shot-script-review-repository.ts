import type { ShotScriptReviewRepository, ShotScriptReviewSummary } from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

interface SqliteShotScriptReviewRow {
  id: string;
  project_id: string;
  shot_script_id: string;
  action: ShotScriptReviewSummary["action"];
  reason: string | null;
  next_action: ShotScriptReviewSummary["nextAction"];
  triggered_task_id: string | null;
  created_at: string;
}

export interface CreateSqliteShotScriptReviewRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteShotScriptReviewRepository(
  options: CreateSqliteShotScriptReviewRepositoryOptions,
): ShotScriptReviewRepository {
  return {
    insert(review) {
      options.db
        .prepare(
          `
            INSERT INTO shot_script_reviews (
              id,
              project_id,
              shot_script_id,
              action,
              reason,
              next_action,
              triggered_task_id,
              created_at
            ) VALUES (
              @id,
              @project_id,
              @shot_script_id,
              @action,
              @reason,
              @next_action,
              @triggered_task_id,
              @created_at
            )
          `,
        )
        .run({
          id: review.id,
          project_id: review.projectId,
          shot_script_id: review.shotScriptId,
          action: review.action,
          reason: review.reason,
          next_action: review.nextAction,
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
              shot_script_id,
              action,
              reason,
              next_action,
              triggered_task_id,
              created_at
            FROM shot_script_reviews
            WHERE project_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          `,
        )
        .get(projectId) as SqliteShotScriptReviewRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
  };
}

function fromSqliteRow(row: SqliteShotScriptReviewRow): ShotScriptReviewSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    shotScriptId: row.shot_script_id,
    action: row.action,
    reason: row.reason,
    nextAction: row.next_action,
    triggeredTaskId: row.triggered_task_id,
    createdAt: row.created_at,
  };
}
