import type { TaskDetail } from "@sweet-star/shared";

import type { TaskRecord } from "../domain/task";

export function toTaskDetailDto(task: TaskRecord): TaskDetail {
  return {
    id: task.id,
    projectId: task.projectId,
    type: task.type,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    errorMessage: task.errorMessage,
    files: {
      inputPath: task.inputRelPath,
      outputPath: task.outputRelPath,
      logPath: task.logRelPath,
    },
  };
}
