import {
  approveSceneSheetRequestSchema,
  createSceneSheetsGenerateTaskResponseSchema,
  regenerateSceneSheetRequestSchema,
  sceneSheetListResponseSchema,
  sceneSheetDetailResponseSchema,
  taskDetailResponseSchema,
  updateSceneSheetPromptRequestSchema,
  type SceneSheetListResponse,
  type SceneSheetRecord,
  type TaskDetail,
  type UpdateSceneSheetPromptRequest,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const sceneSheetsApi = {
  createSceneSheetsGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/tasks/scene-sheets-generate`,
      createSceneSheetsGenerateTaskResponseSchema,
    ),

  listSceneSheets: (projectId: string) =>
    http.get<SceneSheetListResponse>(
      `/projects/${projectId}/scene-sheets`,
      sceneSheetListResponseSchema,
    ),

  updateSceneSheetPrompt: (
    projectId: string,
    sceneId: string,
    data: UpdateSceneSheetPromptRequest,
  ) =>
    http.put<SceneSheetRecord>(
      `/projects/${projectId}/scene-sheets/${sceneId}/prompt`,
      sceneSheetDetailResponseSchema,
      {
        body: jsonBody(updateSceneSheetPromptRequestSchema, data),
      },
    ),

  regenerateSceneSheet: (
    projectId: string,
    sceneId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/scene-sheets/${sceneId}/regenerate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateSceneSheetRequestSchema, data),
      },
    ),

  approveSceneSheet: (
    projectId: string,
    sceneId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<SceneSheetRecord>(
      `/projects/${projectId}/scene-sheets/${sceneId}/approve`,
      sceneSheetDetailResponseSchema,
      {
        body: jsonBody(approveSceneSheetRequestSchema, data),
      },
    ),
};
