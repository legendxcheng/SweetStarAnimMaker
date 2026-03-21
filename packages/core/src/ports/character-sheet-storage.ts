import type { CharacterSheetRecord } from "@sweet-star/shared";

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
}
