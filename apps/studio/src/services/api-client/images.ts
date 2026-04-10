import {
  approveAllImageFramesRequestSchema,
  approveImageFrameRequestSchema,
  generateImageFrameRequestSchema,
  imageFrameListResponseSchema,
  imageFrameResponseSchema,
  regenerateAllImagePromptsResponseSchema,
  regenerateImageFramePromptRequestSchema,
  taskDetailResponseSchema,
  updateImageFramePromptRequestSchema,
  type ImageFrameListResponse,
  type ShotReferenceFrame,
  type TaskDetail,
  type UpdateImageFramePromptRequest,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const imagesApi = {
  createImagesGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/generate`,
      taskDetailResponseSchema,
    ),

  regenerateImages: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/regenerate`,
      taskDetailResponseSchema,
    ),

  listImages: (projectId: string) =>
    http.get<ImageFrameListResponse>(
      `/projects/${projectId}/images`,
      imageFrameListResponseSchema,
    ),

  getImageFrame: (projectId: string, frameId: string) =>
    http.get<ShotReferenceFrame>(
      `/projects/${projectId}/images/frames/${frameId}`,
      imageFrameResponseSchema,
    ),

  updateImageFramePrompt: (
    projectId: string,
    frameId: string,
    data: UpdateImageFramePromptRequest,
  ) =>
    http.put<ShotReferenceFrame>(
      `/projects/${projectId}/images/frames/${frameId}/prompt`,
      imageFrameResponseSchema,
      {
        body: jsonBody(updateImageFramePromptRequestSchema, data),
      },
    ),

  regenerateImageFramePrompt: (
    projectId: string,
    frameId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/frames/${frameId}/regenerate-prompt`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateImageFramePromptRequestSchema, data),
      },
    ),

  regenerateAllImagePrompts: (projectId: string, data: Record<string, never> = {}) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/batch/regenerate-all-prompts`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateImageFramePromptRequestSchema, data),
      },
    ),

  generateAllImageFrames: (projectId: string, data: Record<string, never> = {}) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/batch/generate-all-frames`,
      taskDetailResponseSchema,
      {
        body: jsonBody(generateImageFrameRequestSchema, data),
      },
    ),

  regenerateFailedImagePrompts: (projectId: string, data: Record<string, never> = {}) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/batch/regenerate-failed-prompts`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateImageFramePromptRequestSchema, data),
      },
    ),

  regenerateUnfinishedImagePrompts: (projectId: string, data: Record<string, never> = {}) =>
    http.post(
      `/projects/${projectId}/images/regenerate-unfinished-prompts`,
      regenerateAllImagePromptsResponseSchema,
      {
        body: jsonBody(regenerateImageFramePromptRequestSchema, data),
      },
    ),

  regenerateFailedImageFrames: (projectId: string, data: Record<string, never> = {}) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/batch/regenerate-failed-frames`,
      taskDetailResponseSchema,
      {
        body: jsonBody(generateImageFrameRequestSchema, data),
      },
    ),

  generateImageFrame: (projectId: string, frameId: string, data: Record<string, never> = {}) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/images/frames/${frameId}/generate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(generateImageFrameRequestSchema, data),
      },
    ),

  approveImageFrame: (projectId: string, frameId: string, data: Record<string, never> = {}) =>
    http.post<ShotReferenceFrame>(
      `/projects/${projectId}/images/frames/${frameId}/approve`,
      imageFrameResponseSchema,
      {
        body: jsonBody(approveImageFrameRequestSchema, data),
      },
    ),

  approveAllImageFrames: (projectId: string, data: Record<string, never> = {}) =>
    http.post<ImageFrameListResponse>(
      `/projects/${projectId}/images/approve-all`,
      imageFrameListResponseSchema,
      {
        body: jsonBody(approveAllImageFramesRequestSchema, data),
      },
    ),
};
