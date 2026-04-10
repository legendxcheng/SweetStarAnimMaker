import {
  createStoryboardGenerateTaskResponseSchema,
  currentStoryboardResponseSchema,
  saveStoryboardRequestSchema,
  storyboardReviewWorkspaceResponseSchema,
  taskDetailResponseSchema,
  type CurrentStoryboard,
  type SaveStoryboardRequest,
  type StoryboardReviewWorkspace,
  type TaskDetail,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const storyboardApi = {
  createStoryboardGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/tasks/storyboard-generate`,
      createStoryboardGenerateTaskResponseSchema,
    ),

  regenerateStoryboard: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/storyboard/regenerate`,
      taskDetailResponseSchema,
    ),

  getStoryboardReviewWorkspace: (projectId: string) =>
    http.get<StoryboardReviewWorkspace>(
      `/projects/${projectId}/storyboard/review`,
      storyboardReviewWorkspaceResponseSchema,
    ),

  getCurrentStoryboard: (projectId: string) =>
    http.get<CurrentStoryboard>(
      `/projects/${projectId}/storyboard/current`,
      currentStoryboardResponseSchema,
    ),

  saveStoryboard: (projectId: string, data: SaveStoryboardRequest) =>
    http.put<CurrentStoryboard>(
      `/projects/${projectId}/storyboard`,
      currentStoryboardResponseSchema,
      {
        body: jsonBody(saveStoryboardRequestSchema, data),
      },
    ),

  approveStoryboard: (projectId: string, data: Record<string, never> = {}) =>
    http.post<CurrentStoryboard>(
      `/projects/${projectId}/storyboard/approve`,
      currentStoryboardResponseSchema,
      {
        body: JSON.stringify(data),
      },
    ),

  rejectStoryboard: (projectId: string, data: Record<string, never> = {}) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/storyboard/reject`,
      taskDetailResponseSchema,
      {
        body: JSON.stringify(data),
      },
    ),
};
