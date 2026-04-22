export type SceneSheetStatus = "generating" | "in_review" | "approved" | "failed";

export interface CurrentSceneSheetBatchSummary {
  id: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneCount: number;
  approvedSceneCount: number;
  updatedAt: string;
}

export interface SceneSheetRecord {
  id: string;
  projectId: string;
  batchId: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneName: string;
  scenePurpose: string;
  promptTextGenerated: string;
  promptTextCurrent: string;
  constraintsText: string;
  imageAssetPath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  provider: string | null;
  model: string | null;
  status: SceneSheetStatus;
  updatedAt: string;
  approvedAt: string | null;
  sourceTaskId: string | null;
}

export interface SceneSheetListResponse {
  currentBatch: CurrentSceneSheetBatchSummary;
  scenes: SceneSheetRecord[];
}

export interface UpdateSceneSheetPromptRequest {
  promptTextCurrent: string;
}

export interface RegenerateSceneSheetRequest {}

export interface ApproveSceneSheetRequest {}
