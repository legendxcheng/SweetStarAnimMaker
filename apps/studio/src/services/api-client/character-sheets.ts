import {
  approveCharacterSheetRequestSchema,
  characterSheetDetailResponseSchema,
  characterSheetListResponseSchema,
  createCharacterSheetsGenerateTaskResponseSchema,
  regenerateCharacterSheetRequestSchema,
  taskDetailResponseSchema,
  updateCharacterSheetPromptRequestSchema,
  type CharacterSheetListResponse,
  type CharacterSheetRecord,
  type TaskDetail,
  type UpdateCharacterSheetPromptRequest,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const characterSheetsApi = {
  createCharacterSheetsGenerateTask: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/tasks/character-sheets-generate`,
      createCharacterSheetsGenerateTaskResponseSchema,
    ),

  regenerateCharacterSheets: (projectId: string) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/character-sheets/regenerate`,
      taskDetailResponseSchema,
    ),

  listCharacterSheets: (projectId: string) =>
    http.get<CharacterSheetListResponse>(
      `/projects/${projectId}/character-sheets`,
      characterSheetListResponseSchema,
    ),

  getCharacterSheet: (projectId: string, characterId: string) =>
    http.get<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}`,
      characterSheetDetailResponseSchema,
    ),

  updateCharacterSheetPrompt: (
    projectId: string,
    characterId: string,
    data: UpdateCharacterSheetPromptRequest,
  ) =>
    http.put<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/prompt`,
      characterSheetDetailResponseSchema,
      {
        body: jsonBody(updateCharacterSheetPromptRequestSchema, data),
      },
    ),

  uploadCharacterReferenceImages: (projectId: string, characterId: string, files: File[]) => {
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    return http.post<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/reference-images`,
      characterSheetDetailResponseSchema,
      {
        body: formData,
      },
    );
  },

  deleteCharacterReferenceImage: (
    projectId: string,
    characterId: string,
    referenceImageId: string,
  ) =>
    http.del<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/reference-images/${referenceImageId}`,
      characterSheetDetailResponseSchema,
    ),

  regenerateCharacterSheet: (
    projectId: string,
    characterId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<TaskDetail>(
      `/projects/${projectId}/character-sheets/${characterId}/regenerate`,
      taskDetailResponseSchema,
      {
        body: jsonBody(regenerateCharacterSheetRequestSchema, data),
      },
    ),

  approveCharacterSheet: (
    projectId: string,
    characterId: string,
    data: Record<string, never> = {},
  ) =>
    http.post<CharacterSheetRecord>(
      `/projects/${projectId}/character-sheets/${characterId}/approve`,
      characterSheetDetailResponseSchema,
      {
        body: jsonBody(approveCharacterSheetRequestSchema, data),
      },
    ),
};
