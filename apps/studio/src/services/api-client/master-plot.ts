import {
  createMasterPlotGenerateTaskResponseSchema,
  currentMasterPlotResponseSchema,
  masterPlotReviewWorkspaceResponseSchema,
  saveMasterPlotRequestSchema,
  taskDetailResponseSchema,
  type CurrentMasterPlot,
  type MasterPlotReviewWorkspace,
  type SaveMasterPlotRequest,
  type TaskDetail,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const masterPlotApi = {
  createMasterPlotGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/tasks/master-plot-generate`,
      createMasterPlotGenerateTaskResponseSchema,
    ),

  regenerateMasterPlot: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/master-plot/regenerate`,
      taskDetailResponseSchema,
    ),

  getMasterPlotReviewWorkspace: (projectId: string) =>
    http.get<MasterPlotReviewWorkspace>(
      `/projects/${projectId}/master-plot/review`,
      masterPlotReviewWorkspaceResponseSchema,
    ),

  saveMasterPlot: (projectId: string, data: SaveMasterPlotRequest) =>
    http.put<CurrentMasterPlot>(
      `/projects/${projectId}/master-plot`,
      currentMasterPlotResponseSchema,
      {
        body: jsonBody(saveMasterPlotRequestSchema, data),
      },
    ),

  approveMasterPlot: (projectId: string, data: Record<string, never> = {}) =>
    http.post<CurrentMasterPlot>(
      `/projects/${projectId}/master-plot/approve`,
      currentMasterPlotResponseSchema,
      {
        body: JSON.stringify(data),
      },
    ),

  rejectMasterPlot: (projectId: string, data: { reason: string }) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/master-plot/reject`,
      taskDetailResponseSchema,
      {
        body: JSON.stringify(data),
      },
    ),
};
