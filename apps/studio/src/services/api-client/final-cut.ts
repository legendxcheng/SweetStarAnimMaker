import {
  finalCutResponseSchema,
  generateFinalCutRequestSchema,
  taskDetailResponseSchema,
  type FinalCutResponse,
  type TaskDetail,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const finalCutApi = {
  createFinalCutGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/final-cut/generate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(generateFinalCutRequestSchema, {}),
      },
    ),

  getFinalCut: (projectId: string) =>
    http.get<FinalCutResponse>(`/projects/${projectId}/final-cut`, finalCutResponseSchema),
};
