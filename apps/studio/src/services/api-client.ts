import {
  createStoryboardGenerateTaskResponseSchema,
  createProjectRequestSchema,
  currentStoryboardResponseSchema,
  storyboardReviewWorkspaceResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  saveStoryboardRequestSchema,
  taskDetailResponseSchema,
  type CurrentStoryboard,
  type ProjectDetail,
  type ProjectSummary,
  type SaveStoryboardRequest,
  type StoryboardReviewWorkspace,
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
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
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

  createStoryboardGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/tasks/storyboard-generate`,
      createStoryboardGenerateTaskResponseSchema,
      {
        method: "POST",
      },
    ),

  getTaskDetail: (taskId: string) =>
    request<TaskDetail>(`/tasks/${taskId}`, taskDetailResponseSchema, {
      method: "GET",
    }),

  getStoryboardReviewWorkspace: (projectId: string) =>
    request<StoryboardReviewWorkspace>(
      `/projects/${projectId}/storyboard/review`,
      storyboardReviewWorkspaceResponseSchema,
      {
        method: "GET",
      },
    ),

  getCurrentStoryboard: (projectId: string) =>
    request<CurrentStoryboard>(
      `/projects/${projectId}/storyboard/current`,
      currentStoryboardResponseSchema,
      {
        method: "GET",
      },
    ),

  saveStoryboard: (projectId: string, data: SaveStoryboardRequest) =>
    request<CurrentStoryboard>(
      `/projects/${projectId}/storyboard`,
      currentStoryboardResponseSchema,
      {
        method: "PUT",
        body: JSON.stringify(saveStoryboardRequestSchema.parse(data)),
      },
    ),

  approveStoryboard: (projectId: string, data: Record<string, never> = {}) =>
    request<CurrentStoryboard>(
      `/projects/${projectId}/storyboard/approve`,
      currentStoryboardResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  rejectStoryboard: (projectId: string, data: Record<string, never> = {}) =>
    request<TaskDetail>(
      `/projects/${projectId}/storyboard/reject`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
};
