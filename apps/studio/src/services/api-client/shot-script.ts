import {
  approveAllShotScriptSegmentsRequestSchema,
  approveShotScriptSegmentRequestSchema,
  createShotScriptGenerateTaskResponseSchema,
  currentShotScriptResponseSchema,
  regenerateShotScriptSegmentRequestSchema,
  saveShotScriptSegmentRequestSchema,
  shotScriptReviewWorkspaceResponseSchema,
  taskDetailResponseSchema,
  type CurrentShotScript,
  type SaveShotScriptSegmentRequest,
  type ShotScriptReviewWorkspace,
  type TaskDetail,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const shotScriptApi = {
  createShotScriptGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/shot-script/generate`,
      createShotScriptGenerateTaskResponseSchema,
    ),

  regenerateShotScript: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/shot-script/regenerate`,
      taskDetailResponseSchema,
    ),

  getShotScriptReviewWorkspace: (projectId: string) =>
    http.get<ShotScriptReviewWorkspace>(
      `/projects/${projectId}/shot-script/review`,
      shotScriptReviewWorkspaceResponseSchema,
    ),

  getCurrentShotScript: (projectId: string) =>
    http.get<CurrentShotScript>(
      `/projects/${projectId}/shot-script/current`,
      currentShotScriptResponseSchema,
    ),

  saveShotScriptSegment: (
    projectId: string,
    segmentId: string,
    data: SaveShotScriptSegmentRequest,
  ) =>
    http.put<CurrentShotScript>(
      `/projects/${projectId}/shot-script/segments/${segmentId}`,
      currentShotScriptResponseSchema,
      {
        body: jsonBody(saveShotScriptSegmentRequestSchema, data),
      },
    ),

  approveShotScriptSegment: (
    projectId: string,
    segmentId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<CurrentShotScript>(
      `/projects/${projectId}/shot-script/segments/${segmentId}/approve`,
      currentShotScriptResponseSchema,
      {
        body: jsonBody(approveShotScriptSegmentRequestSchema, data),
      },
    ),

  approveAllShotScriptSegments: (projectId: string, data: Record<string, never> = {}) =>
    http.post<CurrentShotScript>(
      `/projects/${projectId}/shot-script/approve-all`,
      currentShotScriptResponseSchema,
      {
        body: jsonBody(approveAllShotScriptSegmentsRequestSchema, data),
      },
    ),

  regenerateShotScriptSegment: (
    projectId: string,
    segmentId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/shot-script/segments/${segmentId}/regenerate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateShotScriptSegmentRequestSchema, data),
      },
    ),
};
