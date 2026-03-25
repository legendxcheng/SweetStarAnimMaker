import {
  approveAllImageFramesRequestSchema,
  approveAllVideoSegmentsRequestSchema,
  approveImageFrameRequestSchema,
  approveVideoSegmentRequestSchema,
  characterSheetDetailResponseSchema,
  characterSheetListResponseSchema,
  createCharacterSheetsGenerateTaskResponseSchema,
  createMasterPlotGenerateTaskResponseSchema,
  createShotScriptGenerateTaskResponseSchema,
  createStoryboardGenerateTaskResponseSchema,
  createProjectRequestSchema,
  currentMasterPlotResponseSchema,
  currentShotScriptResponseSchema,
  currentStoryboardResponseSchema,
  generateImageFrameRequestSchema,
  imageFrameListResponseSchema,
  imageFrameResponseSchema,
  segmentVideoResponseSchema,
  videoListResponseSchema,
  regenerateAllImagePromptsResponseSchema,
  regenerateImageFramePromptRequestSchema,
  regenerateVideoSegmentRequestSchema,
  updateCharacterSheetPromptRequestSchema,
  updateImageFramePromptRequestSchema,
  masterPlotReviewWorkspaceResponseSchema,
  shotScriptReviewWorkspaceResponseSchema,
  storyboardReviewWorkspaceResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  saveShotScriptSegmentRequestSchema,
  saveMasterPlotRequestSchema,
  approveAllShotScriptSegmentsRequestSchema,
  approveShotScriptSegmentRequestSchema,
  approveCharacterSheetRequestSchema,
  regenerateCharacterSheetRequestSchema,
  regenerateShotScriptSegmentRequestSchema,
  saveStoryboardRequestSchema,
  taskDetailResponseSchema,
  type CharacterSheetListResponse,
  type CharacterSheetRecord,
  type CurrentMasterPlot,
  type CurrentShotScript,
  type CurrentStoryboard,
  type ImageFrameListResponse,
  type MasterPlotReviewWorkspace,
  type ProjectDetail,
  type ProjectSummary,
  type RegenerateAllImagePromptsResponse,
  type SaveShotScriptSegmentRequest,
  type SaveMasterPlotRequest,
  type SegmentFrameRecord,
  type SegmentVideoRecord,
  type ShotScriptReviewWorkspace,
  type UpdateCharacterSheetPromptRequest,
  type UpdateImageFramePromptRequest,
  type SaveStoryboardRequest,
  type StoryboardReviewWorkspace,
  type TaskDetail,
  type VideoListResponse,
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

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
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

  createMasterPlotGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/tasks/master-plot-generate`,
      createMasterPlotGenerateTaskResponseSchema,
      {
        method: "POST",
      },
    ),

  regenerateMasterPlot: (projectId: string) =>
    request<TaskDetail>(`/projects/${projectId}/master-plot/regenerate`, taskDetailResponseSchema, {
      method: "POST",
    }),

  createCharacterSheetsGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/tasks/character-sheets-generate`,
      createCharacterSheetsGenerateTaskResponseSchema,
      {
        method: "POST",
      },
    ),

  regenerateCharacterSheets: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/character-sheets/regenerate`,
      taskDetailResponseSchema,
      {
        method: "POST",
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

  regenerateStoryboard: (projectId: string) =>
    request<TaskDetail>(`/projects/${projectId}/storyboard/regenerate`, taskDetailResponseSchema, {
      method: "POST",
    }),

  createShotScriptGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/shot-script/generate`,
      createShotScriptGenerateTaskResponseSchema,
      {
        method: "POST",
      },
    ),

  regenerateShotScript: (projectId: string) =>
    request<TaskDetail>(`/projects/${projectId}/shot-script/regenerate`, taskDetailResponseSchema, {
      method: "POST",
    }),

  createImagesGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/images/generate`,
      taskDetailResponseSchema,
      {
        method: "POST",
      },
    ),

  createVideosGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/videos/generate`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(regenerateVideoSegmentRequestSchema.parse({})),
      },
    ),

  regenerateImages: (projectId: string) =>
    request<TaskDetail>(`/projects/${projectId}/images/regenerate`, taskDetailResponseSchema, {
      method: "POST",
    }),

  listCharacterSheets: (projectId: string) =>
    request<CharacterSheetListResponse>(
      `/projects/${projectId}/character-sheets`,
      characterSheetListResponseSchema,
      {
        method: "GET",
      },
    ),

  getCharacterSheet: (projectId: string, characterId: string) =>
    request<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}`,
      characterSheetDetailResponseSchema,
      {
        method: "GET",
      },
    ),

  updateCharacterSheetPrompt: (
    projectId: string,
    characterId: string,
    data: UpdateCharacterSheetPromptRequest,
  ) =>
    request<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/prompt`,
      characterSheetDetailResponseSchema,
      {
        method: "PUT",
        body: JSON.stringify(updateCharacterSheetPromptRequestSchema.parse(data)),
      },
    ),

  uploadCharacterReferenceImages: (projectId: string, characterId: string, files: File[]) => {
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    return request<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/reference-images`,
      characterSheetDetailResponseSchema,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  deleteCharacterReferenceImage: (
    projectId: string,
    characterId: string,
    referenceImageId: string,
  ) =>
    request<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/reference-images/${referenceImageId}`,
      characterSheetDetailResponseSchema,
      {
        method: "DELETE",
      },
    ),

  regenerateCharacterSheet: (projectId: string, characterId: string, data: Record<string, never> = {}) =>
    request<TaskDetail>(
      `/projects/${projectId}/character-sheets/${characterId}/regenerate`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(regenerateCharacterSheetRequestSchema.parse(data)),
      },
    ),

  approveCharacterSheet: (projectId: string, characterId: string, data: Record<string, never> = {}) =>
    request<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/approve`,
      characterSheetDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveCharacterSheetRequestSchema.parse(data)),
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

  getShotScriptReviewWorkspace: (projectId: string) =>
    request<ShotScriptReviewWorkspace>(
      `/projects/${projectId}/shot-script/review`,
      shotScriptReviewWorkspaceResponseSchema,
      {
        method: "GET",
      },
    ),

  getMasterPlotReviewWorkspace: (projectId: string) =>
    request<MasterPlotReviewWorkspace>(
      `/projects/${projectId}/master-plot/review`,
      masterPlotReviewWorkspaceResponseSchema,
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

  getCurrentShotScript: (projectId: string) =>
    request<CurrentShotScript>(
      `/projects/${projectId}/shot-script/current`,
      currentShotScriptResponseSchema,
      {
        method: "GET",
      },
    ),

  listImages: (projectId: string) =>
    request<ImageFrameListResponse>(
      `/projects/${projectId}/images`,
      imageFrameListResponseSchema,
      {
        method: "GET",
      },
    ),

  listVideos: (projectId: string) =>
    request<VideoListResponse>(
      `/projects/${projectId}/videos`,
      videoListResponseSchema,
      {
        method: "GET",
      },
    ),

  getImageFrame: (projectId: string, frameId: string) =>
    request<SegmentFrameRecord>(
      `/projects/${projectId}/images/frames/${frameId}`,
      imageFrameResponseSchema,
      {
        method: "GET",
      },
    ),

  getVideo: (projectId: string, videoId: string) =>
    request<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}`,
      segmentVideoResponseSchema,
      {
        method: "GET",
      },
    ),

  updateImageFramePrompt: (
    projectId: string,
    frameId: string,
    data: UpdateImageFramePromptRequest,
  ) =>
    request<SegmentFrameRecord>(
      `/projects/${projectId}/images/frames/${frameId}/prompt`,
      imageFrameResponseSchema,
      {
        method: "PUT",
        body: JSON.stringify(updateImageFramePromptRequestSchema.parse(data)),
      },
    ),

  regenerateImageFramePrompt: (
    projectId: string,
    frameId: string,
    data: Record<string, never> = {},
  ) =>
    request<TaskDetail>(
      `/projects/${projectId}/images/frames/${frameId}/regenerate-prompt`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(regenerateImageFramePromptRequestSchema.parse(data)),
      },
    ),

  regenerateAllImagePrompts: (projectId: string, data: Record<string, never> = {}) =>
    request<RegenerateAllImagePromptsResponse>(
      `/projects/${projectId}/images/regenerate-prompts`,
      regenerateAllImagePromptsResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(regenerateImageFramePromptRequestSchema.parse(data)),
      },
    ),

  generateImageFrame: (projectId: string, frameId: string, data: Record<string, never> = {}) =>
    request<TaskDetail>(
      `/projects/${projectId}/images/frames/${frameId}/generate`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(generateImageFrameRequestSchema.parse(data)),
      },
    ),

  approveImageFrame: (projectId: string, frameId: string, data: Record<string, never> = {}) =>
    request<SegmentFrameRecord>(
      `/projects/${projectId}/images/frames/${frameId}/approve`,
      imageFrameResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveImageFrameRequestSchema.parse(data)),
      },
    ),

  approveAllImageFrames: (projectId: string, data: Record<string, never> = {}) =>
    request<ImageFrameListResponse>(
      `/projects/${projectId}/images/approve-all`,
      imageFrameListResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveAllImageFramesRequestSchema.parse(data)),
      },
    ),

  regenerateVideoSegment: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    request<TaskDetail>(
      `/projects/${projectId}/videos/segments/${videoId}/regenerate`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(regenerateVideoSegmentRequestSchema.parse(data)),
      },
    ),

  approveVideoSegment: (
    projectId: string,
    videoId: string,
    data: Record<string, never> = {},
  ) =>
    request<SegmentVideoRecord>(
      `/projects/${projectId}/videos/segments/${videoId}/approve`,
      segmentVideoResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveVideoSegmentRequestSchema.parse(data)),
      },
    ),

  approveAllVideoSegments: (projectId: string, data: Record<string, never> = {}) =>
    request<VideoListResponse>(
      `/projects/${projectId}/videos/approve-all`,
      videoListResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveAllVideoSegmentsRequestSchema.parse(data)),
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

  saveShotScriptSegment: (
    projectId: string,
    segmentId: string,
    data: SaveShotScriptSegmentRequest,
  ) =>
    request<CurrentShotScript>(
      `/projects/${projectId}/shot-script/segments/${segmentId}`,
      currentShotScriptResponseSchema,
      {
        method: "PUT",
        body: JSON.stringify(saveShotScriptSegmentRequestSchema.parse(data)),
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

  approveStoryboard: (projectId: string, data: Record<string, never> = {}) =>
    request<CurrentStoryboard>(
      `/projects/${projectId}/storyboard/approve`,
      currentStoryboardResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),

  approveShotScriptSegment: (
    projectId: string,
    segmentId: string,
    data: Record<string, never> = {},
  ) =>
    request<CurrentShotScript>(
      `/projects/${projectId}/shot-script/segments/${segmentId}/approve`,
      currentShotScriptResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveShotScriptSegmentRequestSchema.parse(data)),
      },
    ),

  approveAllShotScriptSegments: (projectId: string, data: Record<string, never> = {}) =>
    request<CurrentShotScript>(
      `/projects/${projectId}/shot-script/approve-all`,
      currentShotScriptResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(approveAllShotScriptSegmentsRequestSchema.parse(data)),
      },
    ),

  approveMasterPlot: (projectId: string, data: Record<string, never> = {}) =>
    request<CurrentMasterPlot>(
      `/projects/${projectId}/master-plot/approve`,
      currentMasterPlotResponseSchema,
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

  regenerateShotScriptSegment: (
    projectId: string,
    segmentId: string,
    data: Record<string, never> = {},
  ) =>
    request<TaskDetail>(
      `/projects/${projectId}/shot-script/segments/${segmentId}/regenerate`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(regenerateShotScriptSegmentRequestSchema.parse(data)),
      },
    ),

  rejectMasterPlot: (projectId: string, data: { reason: string }) =>
    request<TaskDetail>(
      `/projects/${projectId}/master-plot/reject`,
      taskDetailResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
};
