import { taskDetailResponseSchema, type TaskDetail } from "@sweet-star/shared";

import { http } from "./shared";

export const tasksApi = {
  getTaskDetail: (taskId: string) =>
    http.get<TaskDetail>(`/tasks/${taskId}`, taskDetailResponseSchema),
};
