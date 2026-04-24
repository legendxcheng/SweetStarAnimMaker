import type {
  CurrentSceneSheetBatchSummary,
  SceneSheetRecord,
  SceneSheetStatus,
} from "@sweet-star/shared";

export const sceneSheetsDirectoryName = "scene-sheets";
export const sceneSheetBatchesDirectoryName = "batches";
export const sceneSheetScenesDirectoryName = "scenes";
export const sceneSheetVersionsDirectoryName = "versions";
export const sceneSheetCurrentBatchFileName = "current-batch.json";
export const sceneSheetManifestFileName = "manifest.json";
export const sceneSheetCurrentImageFileName = "current.png";
export const sceneSheetCurrentMetadataFileName = "current.json";
export const sceneSheetPromptGeneratedFileName = "prompt.generated.txt";
export const sceneSheetPromptCurrentFileName = "prompt.current.txt";
export const sceneSheetPromptVariablesFileName = "prompt.variables.json";
export const sceneSheetImagePromptFileName = "image-prompt.txt";

export interface SceneSheetBatchRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneCount: number;
  storageDir: string;
  manifestRelPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSceneSheetBatchRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneSheetRecordEntity extends SceneSheetRecord {
  projectStorageDir: string;
  storageDir: string;
  currentImageRelPath: string;
  currentMetadataRelPath: string;
  promptGeneratedRelPath: string;
  promptCurrentRelPath: string;
  promptVariablesRelPath: string;
  imagePromptRelPath: string;
  versionsStorageDir: string;
}

export interface CreateSceneSheetRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  batchId: string;
  sourceMasterPlotId: string;
  sourceCharacterSheetBatchId: string;
  sceneName: string;
  scenePurpose: string;
  promptTextGenerated: string;
  promptTextCurrent: string;
  constraintsText: string;
  imageAssetPath?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  provider?: string | null;
  model?: string | null;
  status?: SceneSheetStatus;
  updatedAt: string;
  approvedAt?: string | null;
  sourceTaskId?: string | null;
}

export function toSceneSheetBatchStorageDir(projectStorageDir: string, batchId: string) {
  return `${projectStorageDir}/${sceneSheetsDirectoryName}/${sceneSheetBatchesDirectoryName}/${batchId}`;
}

export function toSceneSheetBatchManifestRelPath(batchId: string) {
  return `${sceneSheetsDirectoryName}/${sceneSheetBatchesDirectoryName}/${batchId}/${sceneSheetManifestFileName}`;
}

export function toSceneSheetStorageDir(batchId: string, sceneId: string) {
  return `${sceneSheetsDirectoryName}/${sceneSheetBatchesDirectoryName}/${batchId}/${sceneSheetScenesDirectoryName}/${sceneId}`;
}

export function toSceneSheetCurrentImageRelPath(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetCurrentImageFileName}`;
}

export function toSceneSheetCurrentMetadataRelPath(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetCurrentMetadataFileName}`;
}

export function toSceneSheetPromptGeneratedRelPath(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetPromptGeneratedFileName}`;
}

export function toSceneSheetPromptCurrentRelPath(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetPromptCurrentFileName}`;
}

export function toSceneSheetPromptVariablesRelPath(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetPromptVariablesFileName}`;
}

export function toSceneSheetImagePromptRelPath(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetImagePromptFileName}`;
}

export function toSceneSheetVersionsStorageDir(batchId: string, sceneId: string) {
  return `${toSceneSheetStorageDir(batchId, sceneId)}/${sceneSheetVersionsDirectoryName}`;
}

export function createSceneSheetBatchRecord(
  input: CreateSceneSheetBatchRecordInput,
): SceneSheetBatchRecord {
  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceMasterPlotId: input.sourceMasterPlotId,
    sourceCharacterSheetBatchId: input.sourceCharacterSheetBatchId,
    sceneCount: input.sceneCount,
    storageDir: toSceneSheetBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toSceneSheetBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function createSceneSheetRecord(
  input: CreateSceneSheetRecordInput,
): SceneSheetRecordEntity {
  const currentImageRelPath = toSceneSheetCurrentImageRelPath(input.batchId, input.id);

  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    batchId: input.batchId,
    sourceMasterPlotId: input.sourceMasterPlotId,
    sourceCharacterSheetBatchId: input.sourceCharacterSheetBatchId,
    sceneName: input.sceneName,
    scenePurpose: input.scenePurpose,
    promptTextGenerated: input.promptTextGenerated,
    promptTextCurrent: input.promptTextCurrent,
    constraintsText: input.constraintsText,
    imageAssetPath: input.imageAssetPath ?? null,
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    status: input.status ?? "generating",
    updatedAt: input.updatedAt,
    approvedAt: input.approvedAt ?? null,
    sourceTaskId: input.sourceTaskId ?? null,
    storageDir: `${input.projectStorageDir}/${toSceneSheetStorageDir(input.batchId, input.id)}`,
    currentImageRelPath,
    currentMetadataRelPath: toSceneSheetCurrentMetadataRelPath(input.batchId, input.id),
    promptGeneratedRelPath: toSceneSheetPromptGeneratedRelPath(input.batchId, input.id),
    promptCurrentRelPath: toSceneSheetPromptCurrentRelPath(input.batchId, input.id),
    promptVariablesRelPath: toSceneSheetPromptVariablesRelPath(input.batchId, input.id),
    imagePromptRelPath: toSceneSheetImagePromptRelPath(input.batchId, input.id),
    versionsStorageDir: toSceneSheetVersionsStorageDir(input.batchId, input.id),
  };
}

export function toCurrentSceneSheetBatchSummary(
  batch: SceneSheetBatchRecord,
  scenes: Pick<SceneSheetRecord, "status">[],
): CurrentSceneSheetBatchSummary {
  return {
    id: batch.id,
    sourceMasterPlotId: batch.sourceMasterPlotId,
    sourceCharacterSheetBatchId: batch.sourceCharacterSheetBatchId,
    sceneCount: batch.sceneCount,
    approvedSceneCount: scenes.filter((scene) => scene.status === "approved").length,
    updatedAt: batch.updatedAt,
  };
}
