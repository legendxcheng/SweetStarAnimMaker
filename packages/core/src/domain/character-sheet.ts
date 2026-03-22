import type {
  CharacterReferenceImage,
  CharacterSheetRecord,
  CharacterSheetStatus,
  CurrentCharacterSheetBatchSummary,
} from "@sweet-star/shared";

export const characterSheetsDirectoryName = "character-sheets";
export const characterSheetBatchesDirectoryName = "batches";
export const characterSheetCharactersDirectoryName = "characters";
export const characterSheetVersionsDirectoryName = "versions";
export const characterSheetCurrentBatchFileName = "current-batch.json";
export const characterSheetManifestFileName = "manifest.json";
export const characterSheetCurrentImageFileName = "current.png";
export const characterSheetCurrentMetadataFileName = "current.json";
export const characterSheetPromptGeneratedFileName = "prompt.generated.txt";
export const characterSheetPromptCurrentFileName = "prompt.current.txt";
export const characterSheetPromptVariablesFileName = "prompt.variables.json";
export const characterSheetImagePromptFileName = "image-prompt.txt";
export const characterSheetReferencesDirectoryName = "references";
export const characterSheetReferenceManifestFileName = "manifest.json";

export interface CharacterSheetBatchRecord {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceMasterPlotId: string;
  characterCount: number;
  storageDir: string;
  manifestRelPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterSheetBatchRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  sourceMasterPlotId: string;
  characterCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSheetRecordEntity extends CharacterSheetRecord {
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

export interface CreateCharacterSheetRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  batchId: string;
  sourceMasterPlotId: string;
  characterName: string;
  promptTextGenerated: string;
  promptTextCurrent: string;
  referenceImages?: CharacterReferenceImage[];
  imageAssetPath?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  provider?: string | null;
  model?: string | null;
  status?: CharacterSheetStatus;
  updatedAt: string;
  approvedAt?: string | null;
  sourceTaskId?: string | null;
}

export function toCharacterSheetBatchStorageDir(
  projectStorageDir: string,
  batchId: string,
) {
  return `${projectStorageDir}/${characterSheetsDirectoryName}/${characterSheetBatchesDirectoryName}/${batchId}`;
}

export function toCharacterSheetBatchManifestRelPath(batchId: string) {
  return `${characterSheetsDirectoryName}/${characterSheetBatchesDirectoryName}/${batchId}/${characterSheetManifestFileName}`;
}

export function toCharacterSheetStorageDir(batchId: string, characterId: string) {
  return `${characterSheetsDirectoryName}/${characterSheetBatchesDirectoryName}/${batchId}/${characterSheetCharactersDirectoryName}/${characterId}`;
}

export function toCharacterSheetCurrentImageRelPath(batchId: string, characterId: string) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetCurrentImageFileName}`;
}

export function toCharacterSheetCurrentMetadataRelPath(
  batchId: string,
  characterId: string,
) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetCurrentMetadataFileName}`;
}

export function toCharacterSheetPromptGeneratedRelPath(
  batchId: string,
  characterId: string,
) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetPromptGeneratedFileName}`;
}

export function toCharacterSheetPromptCurrentRelPath(
  batchId: string,
  characterId: string,
) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetPromptCurrentFileName}`;
}

export function toCharacterSheetPromptVariablesRelPath(
  batchId: string,
  characterId: string,
) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetPromptVariablesFileName}`;
}

export function toCharacterSheetImagePromptRelPath(
  batchId: string,
  characterId: string,
) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetImagePromptFileName}`;
}

export function toCharacterSheetVersionsStorageDir(batchId: string, characterId: string) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetVersionsDirectoryName}`;
}

export function toCharacterSheetReferencesStorageDir(batchId: string, characterId: string) {
  return `${toCharacterSheetStorageDir(batchId, characterId)}/${characterSheetReferencesDirectoryName}`;
}

export function toCharacterSheetReferenceManifestRelPath(batchId: string, characterId: string) {
  return `${toCharacterSheetReferencesStorageDir(batchId, characterId)}/${characterSheetReferenceManifestFileName}`;
}

export function createCharacterSheetBatchRecord(
  input: CreateCharacterSheetBatchRecordInput,
): CharacterSheetBatchRecord {
  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceMasterPlotId: input.sourceMasterPlotId,
    characterCount: input.characterCount,
    storageDir: toCharacterSheetBatchStorageDir(input.projectStorageDir, input.id),
    manifestRelPath: toCharacterSheetBatchManifestRelPath(input.id),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function createCharacterSheetRecord(
  input: CreateCharacterSheetRecordInput,
): CharacterSheetRecordEntity {
  return {
    id: input.id,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    batchId: input.batchId,
    sourceMasterPlotId: input.sourceMasterPlotId,
    characterName: input.characterName,
    promptTextGenerated: input.promptTextGenerated,
    promptTextCurrent: input.promptTextCurrent,
    referenceImages: input.referenceImages ?? [],
    imageAssetPath:
      input.imageAssetPath ?? toCharacterSheetCurrentImageRelPath(input.batchId, input.id),
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    status: input.status ?? "generating",
    updatedAt: input.updatedAt,
    approvedAt: input.approvedAt ?? null,
    sourceTaskId: input.sourceTaskId ?? null,
    storageDir: `${input.projectStorageDir}/${toCharacterSheetStorageDir(input.batchId, input.id)}`,
    currentImageRelPath: toCharacterSheetCurrentImageRelPath(input.batchId, input.id),
    currentMetadataRelPath: toCharacterSheetCurrentMetadataRelPath(input.batchId, input.id),
    promptGeneratedRelPath: toCharacterSheetPromptGeneratedRelPath(input.batchId, input.id),
    promptCurrentRelPath: toCharacterSheetPromptCurrentRelPath(input.batchId, input.id),
    promptVariablesRelPath: toCharacterSheetPromptVariablesRelPath(input.batchId, input.id),
    imagePromptRelPath: toCharacterSheetImagePromptRelPath(input.batchId, input.id),
    versionsStorageDir: toCharacterSheetVersionsStorageDir(input.batchId, input.id),
  };
}

export function toCurrentCharacterSheetBatchSummary(
  batch: CharacterSheetBatchRecord,
  characters: Pick<CharacterSheetRecord, "status">[],
): CurrentCharacterSheetBatchSummary {
  return {
    id: batch.id,
    sourceMasterPlotId: batch.sourceMasterPlotId,
    characterCount: batch.characterCount,
    approvedCharacterCount: characters.filter((character) => character.status === "approved")
      .length,
    updatedAt: batch.updatedAt,
  };
}
