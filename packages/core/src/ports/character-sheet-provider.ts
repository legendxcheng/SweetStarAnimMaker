import type { CurrentMasterPlot } from "@sweet-star/shared";

export interface GenerateCharacterSheetPromptInput {
  projectId: string;
  masterPlot: CurrentMasterPlot;
  characterName: string;
  promptText: string;
}

export interface GenerateCharacterSheetPromptResult {
  promptText: string;
  rawResponse: string;
  provider: string;
  model: string;
}

export interface GenerateCharacterSheetImageInput {
  projectId: string;
  characterId: string;
  promptText: string;
  referenceImagePaths?: string[];
}

export interface GenerateCharacterSheetImageResult {
  imageBytes: Uint8Array;
  width: number;
  height: number;
  rawResponse: string;
  provider: string;
  model: string;
}

export interface CharacterSheetPromptProvider {
  generateCharacterPrompt(
    input: GenerateCharacterSheetPromptInput,
  ): Promise<GenerateCharacterSheetPromptResult> | GenerateCharacterSheetPromptResult;
}

export interface CharacterSheetImageProvider {
  generateCharacterSheetImage(
    input: GenerateCharacterSheetImageInput,
  ): Promise<GenerateCharacterSheetImageResult> | GenerateCharacterSheetImageResult;
}
