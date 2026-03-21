export type CharacterSheetStatus =
  | "generating"
  | "in_review"
  | "approved"
  | "failed";

export interface CurrentCharacterSheetBatchSummary {
  id: string;
  sourceMasterPlotId: string;
  characterCount: number;
  approvedCharacterCount: number;
  updatedAt: string;
}

export interface CharacterSheetRecord {
  id: string;
  projectId: string;
  batchId: string;
  sourceMasterPlotId: string;
  characterName: string;
  promptTextGenerated: string;
  promptTextCurrent: string;
  imageAssetPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  provider: string | null;
  model: string | null;
  status: CharacterSheetStatus;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
}

export interface CharacterSheetListResponse {
  currentBatch: CurrentCharacterSheetBatchSummary;
  characters: CharacterSheetRecord[];
}

export interface UpdateCharacterSheetPromptRequest {
  promptTextCurrent: string;
}

export interface RegenerateCharacterSheetRequest {}

export interface ApproveCharacterSheetRequest {}
