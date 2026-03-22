import {
  characterSheetDetailResponseSchema,
  characterSheetListResponseSchema,
  createCharacterSheetsGenerateTaskResponseSchema,
  createMasterPlotGenerateTaskResponseSchema,
  createStoryboardGenerateTaskResponseSchema,
  createProjectRequestSchema,
  currentMasterPlotResponseSchema,
  currentStoryboardResponseSchema,
  updateCharacterSheetPromptRequestSchema,
  masterPlotReviewWorkspaceResponseSchema,
  storyboardReviewWorkspaceResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  saveMasterPlotRequestSchema,
  approveCharacterSheetRequestSchema,
  regenerateCharacterSheetRequestSchema,
  saveStoryboardRequestSchema,
  taskDetailResponseSchema,
  type CharacterSheetListResponse,
  type CharacterSheetRecord,
  type CurrentMasterPlot,
  type CurrentStoryboard,
  type MasterPlotReviewWorkspace,
  type ProjectDetail,
  type ProjectSummary,
  type SaveMasterPlotRequest,
  type UpdateCharacterSheetPromptRequest,
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

  createCharacterSheetsGenerateTask: (projectId: string) =>
    request<TaskDetail>(
      `/projects/${projectId}/tasks/character-sheets-generate`,
      createCharacterSheetsGenerateTaskResponseSchema,
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

  saveStoryboard: (projectId: string, data: SaveStoryboardRequest) =>
    request<CurrentStoryboard>(
      `/projects/${projectId}/storyboard`,
      currentStoryboardResponseSchema,
      {
        method: "PUT",
        body: JSON.stringify(saveStoryboardRequestSchema.parse(data)),
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
