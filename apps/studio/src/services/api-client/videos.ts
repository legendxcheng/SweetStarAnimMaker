import {
  approveAllVideoSegmentsRequestSchema,
  approveVideoSegmentRequestSchema,
  regenerateAllVideoPromptsRequestSchema,
  regenerateVideoPromptRequestSchema,
  regenerateVideoSegmentRequestSchema,
  saveVideoPromptRequestSchema,
  shotVideoResponseSchema,
  taskDetailResponseSchema,
  videoListResponseSchema,
  type ShotVideoRecord,
  type TaskDetail,
  type VideoListResponse,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const videosApi = {
  createVideosGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/videos/generate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateVideoSegmentRequestSchema, {}),
      },
    ),

  listVideos: (projectId: string) =>
    http.get<VideoListResponse>(`/projects/${projectId}/videos`, videoListResponseSchema),

  getVideo: (projectId: string, videoId: string) =>
    http.get<ShotVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}`,
      shotVideoResponseSchema,
    ),

  updateVideoPrompt: (
    projectId: string,
    videoId: string,
    data: { promptTextCurrent: string },
  ) =>
    http.put<ShotVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/prompt`,
      shotVideoResponseSchema,
      {
        body: jsonBody(saveVideoPromptRequestSchema, data),
      },
    ),

  regenerateVideoPrompt: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<ShotVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/regenerate-prompt`,
      shotVideoResponseSchema,
      {
        body: jsonBody(regenerateVideoPromptRequestSchema, data),
      },
    ),

  regenerateAllVideoPrompts: (projectId: string, data: Record<string, never> = {}) =>
    http.post<VideoListResponse>(
      `/projects/${projectId}/videos/regenerate-prompts`,
      videoListResponseSchema,
      {
        body: jsonBody(regenerateAllVideoPromptsRequestSchema, data),
      },
    ),

  regenerateVideoSegment: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/videos/segments/${videoId}/regenerate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateVideoSegmentRequestSchema, data),
      },
    ),

  approveVideoSegment: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<ShotVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/approve`,
      shotVideoResponseSchema,
      {
        body: jsonBody(approveVideoSegmentRequestSchema, data),
      },
    ),

  approveAllVideoSegments: (projectId: string, data: Record<string, never> = {}) =>
    http.post<VideoListResponse>(
      `/projects/${projectId}/videos/approve-all`,
      videoListResponseSchema,
      {
        body: jsonBody(approveAllVideoSegmentsRequestSchema, data),
      },
    ),
};
