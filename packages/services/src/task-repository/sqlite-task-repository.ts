import type {
  MarkTaskFailedInput,
  MarkTaskRunningInput,
  MarkTaskSucceededInput,
  TaskRecord,
  TaskRepository,
} from "@sweet-star/core";

import type { SqliteDatabase } from "../project-repository/sqlite-db";

interface SqliteTaskRow {
  id: string;
  project_id: string;
  type: TaskRecord["type"];
  status: TaskRecord["status"];
  queue_name: string;
  storage_dir: string;
  input_rel_path: string;
  output_rel_path: string;
  log_rel_path: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface CreateSqliteTaskRepositoryOptions {
  db: SqliteDatabase;
}

export function createSqliteTaskRepository(
  options: CreateSqliteTaskRepositoryOptions,
): TaskRepository {
  return {
    insert(task) {
      options.db
        .prepare(
          `
            INSERT INTO tasks (
              id,
              project_id,
              type,
              status,
              queue_name,
              storage_dir,
              input_rel_path,
              output_rel_path,
              log_rel_path,
              error_message,
              created_at,
              updated_at,
              started_at,
              finished_at
            ) VALUES (
              @id,
              @project_id,
              @type,
              @status,
              @queue_name,
              @storage_dir,
              @input_rel_path,
              @output_rel_path,
              @log_rel_path,
              @error_message,
              @created_at,
              @updated_at,
              @started_at,
              @finished_at
            )
          `,
        )
        .run(toSqliteRow(task));
    },
    findById(taskId) {
      const row = options.db
        .prepare(
          `
            SELECT
              id,
              project_id,
              type,
              status,
              queue_name,
              storage_dir,
              input_rel_path,
              output_rel_path,
              log_rel_path,
              error_message,
              created_at,
              updated_at,
              started_at,
              finished_at
            FROM tasks
            WHERE id = ?
          `,
        )
        .get(taskId) as SqliteTaskRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
    findLatestByProjectId(projectId, taskType) {
      const row = options.db
        .prepare(
          `
            SELECT
              id,
              project_id,
              type,
              status,
              queue_name,
              storage_dir,
              input_rel_path,
              output_rel_path,
              log_rel_path,
              error_message,
              created_at,
              updated_at,
              started_at,
              finished_at
            FROM tasks
            WHERE project_id = @project_id
              AND (@task_type IS NULL OR type = @task_type)
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          `,
        )
        .get({
          project_id: projectId,
          task_type: taskType ?? null,
        }) as SqliteTaskRow | undefined;

      return row ? fromSqliteRow(row) : null;
    },
    delete(taskId) {
      options.db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
    },
    markRunning(input) {
      updateTaskLifecycle(options.db, {
        taskId: input.taskId,
        status: "running",
        updatedAt: input.updatedAt,
        startedAt: input.startedAt,
      });
    },
    markSucceeded(input) {
      updateTaskLifecycle(options.db, {
        taskId: input.taskId,
        status: "succeeded",
        updatedAt: input.updatedAt,
        finishedAt: input.finishedAt,
        errorMessage: null,
      });
    },
    markFailed(input) {
      updateTaskLifecycle(options.db, {
        taskId: input.taskId,
        status: "failed",
        updatedAt: input.updatedAt,
        finishedAt: input.finishedAt,
        errorMessage: input.errorMessage,
      });
    },
  };
}

function updateTaskLifecycle(
  db: SqliteDatabase,
  input: {
    taskId: string;
    status: TaskRecord["status"];
    updatedAt: string;
    startedAt?: string;
    finishedAt?: string;
    errorMessage?: string | null;
  },
) {
  db.prepare(
    `
      UPDATE tasks
      SET
        status = @status,
        updated_at = @updated_at,
        started_at = COALESCE(@started_at, started_at),
        finished_at = COALESCE(@finished_at, finished_at),
        error_message = @error_message
      WHERE id = @task_id
    `,
  ).run({
    task_id: input.taskId,
    status: input.status,
    updated_at: input.updatedAt,
    started_at: input.startedAt ?? null,
    finished_at: input.finishedAt ?? null,
    error_message: input.errorMessage ?? null,
  });
}

function toSqliteRow(task: TaskRecord): SqliteTaskRow {
  return {
    id: task.id,
    project_id: task.projectId,
    type: task.type,
    status: task.status,
    queue_name: task.queueName,
    storage_dir: task.storageDir,
    input_rel_path: task.inputRelPath,
    output_rel_path: task.outputRelPath,
    log_rel_path: task.logRelPath,
    error_message: task.errorMessage,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    started_at: task.startedAt,
    finished_at: task.finishedAt,
  };
}

function fromSqliteRow(row: SqliteTaskRow): TaskRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    status: row.status,
    queueName: row.queue_name,
    storageDir: row.storage_dir,
    inputRelPath: row.input_rel_path,
    outputRelPath: row.output_rel_path,
    logRelPath: row.log_rel_path,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}
