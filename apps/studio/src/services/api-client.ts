import {
  approveStoryboardRequestSchema,
  createProjectRequestSchema,
  createStoryboardGenerateTaskResponseSchema,
  currentStoryboardResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  rejectStoryboardRequestSchema,
  saveHumanStoryboardVersionRequestSchema,
  storyboardReviewSummarySchema,
  storyboardReviewWorkspaceResponseSchema,
  taskDetailResponseSchema,
  type ApproveStoryboardRequest,
  type CurrentStoryboard,
  type ProjectDetail,
  type ProjectSummary,
  type RejectStoryboardRequest,
  type SaveHumanStoryboardVersionRequest,
  type StoryboardReviewSummary,
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

  createProject: (data: { name: string; script: string }) =>
    request<ProjectDetail>("/projects", projectDetailResponseSchema, {
      method: "POST",
      body: JSON.stringify(createProjectRequestSchema.parse(data)),
    }),

  getProjectDetail: (projectId: string) =>
    request<ProjectDetail>(
      `/projects/${projectId}`,
      projectDetailResponseSchema,
      {
        method: "GET",
      },
    ),

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

  getReviewWorkspace: (projectId: string) =>
    request<StoryboardReviewWorkspace>(
      `/projects/${projectId}/storyboard/review`,
      storyboardReviewWorkspaceResponseSchema,
      {
        method: "GET",
      },
    ),

  saveHumanVersion: (
    projectId: string,
    data: SaveHumanStoryboardVersionRequest,
  ) =>
    request<CurrentStoryboard>(
      `/projects/${projectId}/storyboard/save-human-version`,
      currentStoryboardResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(saveHumanStoryboardVersionRequestSchema.parse(data)),
      },
    ),

  approveStoryboard: (projectId: string, data: ApproveStoryboardRequest) =>
    request<StoryboardReviewSummary>(
      `/projects/${projectId}/storyboard/approve`,
      storyboardReviewSummarySchema,
      {
        method: "POST",
        body: JSON.stringify(approveStoryboardRequestSchema.parse(data)),
      },
    ),

  rejectStoryboard: (projectId: string, data: RejectStoryboardRequest) =>
    request<StoryboardReviewSummary>(
      `/projects/${projectId}/storyboard/reject`,
      storyboardReviewSummarySchema,
      {
        method: "POST",
        body: JSON.stringify(rejectStoryboardRequestSchema.parse(data)),
      },
    ),
};
