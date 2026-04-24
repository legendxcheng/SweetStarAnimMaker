import type {
  SceneSheetBatchRecord,
  SceneSheetRecordEntity,
} from "../domain/scene-sheet";

export interface WriteSceneSheetBatchManifestInput {
  batch: SceneSheetBatchRecord;
}

export interface WriteGeneratedScenePromptInput {
  scene: SceneSheetRecordEntity;
  promptVariables: Record<string, unknown>;
}

export interface WriteSceneSheetImageVersionInput {
  scene: SceneSheetRecordEntity;
  versionTag: string;
  imageBytes: Uint8Array;
  metadata: Record<string, unknown>;
}

export interface WriteCurrentSceneSheetImageInput {
  scene: SceneSheetRecordEntity;
  imageBytes: Uint8Array;
  metadata: Record<string, unknown>;
}

export interface SceneSheetStorage {
  writeBatchManifest(input: WriteSceneSheetBatchManifestInput): Promise<void> | void;
  writeGeneratedPrompt(input: WriteGeneratedScenePromptInput): Promise<void> | void;
  writeImageVersion(input: WriteSceneSheetImageVersionInput): Promise<void> | void;
  writeCurrentImage(input: WriteCurrentSceneSheetImageInput): Promise<void> | void;
  readPromptTemplate?(
    input: {
      storageDir: string;
      promptTemplateKey: "scene_sheet.generate";
    },
  ): Promise<string> | string;
}
