import {
  approveMasterPlotRequestSchema,
  createMasterPlotGenerateTaskResponseSchema,
  createProjectRequestSchema,
  currentMasterPlotResponseSchema,
  masterPlotReviewSummarySchema,
  masterPlotReviewWorkspaceResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  rejectMasterPlotRequestSchema,
  saveMasterPlotRequestSchema,
  taskDetailResponseSchema,
  type ApproveMasterPlotRequest,
  type CurrentMasterPlot,
  type MasterPlotReviewSummary,
  type MasterPlotReviewWorkspace,
  type ProjectDetail,
  type ProjectSummary,
  type RejectMasterPlotRequest,
  type SaveMasterPlotRequest,
  type TaskDetail,
} from "@sweet-star/shared";
import { config } from "./config";

interface ResponseSchema<T> {
  parse(input: unknown): T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  schema: ResponseSchema<T>,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || response.statusText,
      response.status,
      response.statusText,
    );
  }

  return schema.parse(await response.json());
}

export const apiClient = {
  listProjects: () =>
    request<ProjectSummary[]>("/projects", projectListResponseSchema, {
      method: "GET",
    }),

  createProject: (data: { name: string; premiseText: string }) =>
    request<ProjectDetail>("/projects", projectDetailResponseSchema, {
      method: "POST",
      body: JSON.stringify(createProjectRequestSchema.parse(data)),
    }),

  getProjectDetail: (projectId: string) =>
    request<ProjectDetail>(`/projects/${projectId}`, projectDetailResponseSchema, {
      method: "GET",
    }),

  createMasterPlotGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/tasks/master-plot-generate`,
      createMasterPlotGenerateTaskResponseSchema,
      {
        method: "POST",
      },
    ),

  getTaskDetail: (taskId: string) =>
    request<TaskDetail>(`/tasks/${taskId}`, taskDetailResponseSchema, {
      method: "GET",
    }),

  getReviewWorkspace: (projectId: string) =>
    request<MasterPlotReviewWorkspace>(
      `/projects/${projectId}/master-plot/review`,
      masterPlotReviewWorkspaceResponseSchema,
      {
        method: "GET",
      },
    ),

  saveMasterPlot: (projectId: string, data: SaveMasterPlotRequest) =>
    request<CurrentMasterPlot>(
      `/projects/${projectId}/master-plot`,
      currentMasterPlotResponseSchema,
      {
        method: "PUT",
        body: JSON.stringify(saveMasterPlotRequestSchema.parse(data)),
      },
    ),

  approveMasterPlot: (projectId: string, data: ApproveMasterPlotRequest = {}) =>
    request<MasterPlotReviewSummary>(
      `/projects/${projectId}/master-plot/approve`,
      masterPlotReviewSummarySchema,
      {
        method: "POST",
        body: JSON.stringify(approveMasterPlotRequestSchema.parse(data)),
      },
    ),

  rejectMasterPlot: (projectId: string, data: RejectMasterPlotRequest) =>
    request<MasterPlotReviewSummary>(
      `/projects/${projectId}/master-plot/reject`,
      masterPlotReviewSummarySchema,
      {
        method: "POST",
        body: JSON.stringify(rejectMasterPlotRequestSchema.parse(data)),
      },
    ),
};
