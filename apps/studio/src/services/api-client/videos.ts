import {
  approveAllVideoSegmentsRequestSchema,
  approveVideoSegmentRequestSchema,
  regenerateAllVideoPromptsRequestSchema,
  regenerateVideoPromptRequestSchema,
  regenerateVideoSegmentRequestSchema,
  saveSegmentVideoConfigRequestSchema,
  segmentVideoResponseSchema,
  taskDetailResponseSchema,
  videoListResponseSchema,
  type SaveSegmentVideoConfigRequest,
  type SegmentVideoRecord,
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
    http.get<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}`,
      segmentVideoResponseSchema,
    ),

  saveSegmentVideoConfig: (
    projectId: string,
    videoId: string,
    data: SaveSegmentVideoConfigRequest,
  ) =>
    http.put<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/config`,
      segmentVideoResponseSchema,
      {
        body: jsonBody(saveSegmentVideoConfigRequestSchema, data),
      },
    ),

  updateVideoPrompt: (
    projectId: string,
    videoId: string,
    data: SaveSegmentVideoConfigRequest,
  ) => videosApi.saveSegmentVideoConfig(projectId, videoId, data),

  regenerateVideoPrompt: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/regenerate-prompt`,
      segmentVideoResponseSchema,
      {
        body: jsonBody(regenerateVideoPromptRequestSchema, data),
      },
    ),

  generateVideoSegment: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/videos/segments/${videoId}/generate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateVideoSegmentRequestSchema, data),
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
  ) => videosApi.generateVideoSegment(projectId, videoId, data),

  uploadSegmentReferenceAudio: (
    projectId: string,
    videoId: string,
    file: File,
    options?: { label?: string; durationSec?: number },
  ) => {
    const formData = new FormData();

    formData.append("file", file);

    if (options?.label) {
      formData.append("label", options.label);
    }

    if (options?.durationSec !== undefined) {
      formData.append("durationSec", String(options.durationSec));
    }

    return http.post<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/reference-audios`,
      segmentVideoResponseSchema,
      {
        body: formData,
      },
    );
  },

  deleteSegmentReferenceAudio: (
    projectId: string,
    videoId: string,
    referenceAudioId: string,
  ) =>
    http.del<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/reference-audios/${referenceAudioId}`,
      segmentVideoResponseSchema,
    ),

  approveVideoSegment: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/approve`,
      segmentVideoResponseSchema,
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
