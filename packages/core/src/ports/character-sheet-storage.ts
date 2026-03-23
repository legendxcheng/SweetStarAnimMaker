import type { CharacterReferenceImage, CharacterSheetRecord } from "@sweet-star/shared";

import type {
  CharacterSheetBatchRecord,
  CharacterSheetRecordEntity,
} from "../domain/character-sheet";

export interface InitializeCharacterSheetPromptTemplateInput {
  storageDir: string;
  promptTemplateKey:
    | "character_sheet.prompt.generate"
    | "character_sheet.turnaround.generate";
}

export interface ReadCharacterSheetPromptTemplateInput {
  storageDir: string;
  promptTemplateKey:
    | "character_sheet.prompt.generate"
    | "character_sheet.turnaround.generate";
}

export interface WriteCharacterSheetBatchManifestInput {
  batch: CharacterSheetBatchRecord;
}

export interface WriteGeneratedCharacterPromptInput {
  character: CharacterSheetRecordEntity;
  promptVariables: Record<string, unknown>;
}

export interface WriteCharacterSheetImageVersionInput {
  character: CharacterSheetRecordEntity;
  versionTag: string;
  imageBytes: Uint8Array;
  metadata: Record<string, unknown>;
}

export interface WriteCurrentCharacterSheetImageInput {
  character: CharacterSheetRecordEntity;
  imageBytes: Uint8Array;
  metadata: Record<string, unknown>;
}

export interface ReadCurrentCharacterSheetInput {
  storageDir: string;
  characterId: string;
}

export interface ListCharacterSheetReferenceImagesInput {
  character: CharacterSheetRecordEntity;
}

export interface SaveCharacterSheetReferenceImagesInput {
  character: CharacterSheetRecordEntity;
  files: Array<{
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    contentBytes: Uint8Array;
    createdAt: string;
  }>;
}

export interface DeleteCharacterSheetReferenceImageInput {
  character: CharacterSheetRecordEntity;
  referenceImageId: string;
}

export interface ResolveCharacterSheetReferenceImagePathsInput {
  character: CharacterSheetRecordEntity;
}

export interface GetCharacterSheetReferenceImageContentInput {
  character: CharacterSheetRecordEntity;
  referenceImageId: string;
}

export interface GetCharacterSheetImageContentInput {
  character: CharacterSheetRecordEntity;
}

export interface CharacterSheetReferenceImageContent {
  filePath: string;
  fileName: string;
  mimeType: string;
}

export interface CharacterSheetStorage {
  initializePromptTemplate(
    input: InitializeCharacterSheetPromptTemplateInput,
  ): Promise<void> | void;
  readPromptTemplate(
    input: ReadCharacterSheetPromptTemplateInput,
  ): Promise<string> | string;
  writeBatchManifest(input: WriteCharacterSheetBatchManifestInput): Promise<void> | void;
  writeGeneratedPrompt(
    input: WriteGeneratedCharacterPromptInput,
  ): Promise<void> | void;
  writeImageVersion(
    input: WriteCharacterSheetImageVersionInput,
  ): Promise<void> | void;
  writeCurrentImage(
    input: WriteCurrentCharacterSheetImageInput,
  ): Promise<void> | void;
  readCurrentCharacterSheet(
    input: ReadCurrentCharacterSheetInput,
  ): Promise<CharacterSheetRecord | null> | CharacterSheetRecord | null;
  listReferenceImages(
    input: ListCharacterSheetReferenceImagesInput,
  ): Promise<CharacterReferenceImage[]> | CharacterReferenceImage[];
  saveReferenceImages(
    input: SaveCharacterSheetReferenceImagesInput,
  ): Promise<CharacterReferenceImage[]> | CharacterReferenceImage[];
  deleteReferenceImage(
    input: DeleteCharacterSheetReferenceImageInput,
  ): Promise<CharacterReferenceImage[]> | CharacterReferenceImage[];
  resolveReferenceImagePaths(
    input: ResolveCharacterSheetReferenceImagePathsInput,
  ): Promise<string[]> | string[];
  getReferenceImageContent(
    input: GetCharacterSheetReferenceImageContentInput,
  ): Promise<CharacterSheetReferenceImageContent | null> | CharacterSheetReferenceImageContent | null;
  getImageContent(
    input: GetCharacterSheetImageContentInput,
  ): Promise<CharacterSheetReferenceImageContent | null> | CharacterSheetReferenceImageContent | null;
}
