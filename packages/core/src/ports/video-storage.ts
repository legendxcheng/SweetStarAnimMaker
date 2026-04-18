import type {
  FinalCutRecordEntity,
  SegmentVideoRecordEntity,
  VideoBatchRecord,
} from "../domain/video";

export interface InitializeVideoPromptTemplateInput {
  storageDir: string;
  promptTemplateKey: string;
}

export interface ReadVideoPromptTemplateInput {
  storageDir: string;
  promptTemplateKey: string;
}

export interface WriteVideoPromptSnapshotInput {
  taskStorageDir: string;
  promptText: string;
  promptVariables: Record<string, unknown>;
}

export interface WriteVideoPromptPlanInput {
  segment: SegmentVideoRecordEntity;
  planning: Record<string, unknown>;
}

export interface WriteVideoRawResponseInput {
  taskStorageDir: string;
  rawResponse: string;
}

export interface WriteVideoBatchManifestInput {
  batch: VideoBatchRecord;
}

export interface WriteCurrentVideoInput {
  segment: SegmentVideoRecordEntity;
  videoSourceUrl: string;
  thumbnailSourceUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface WriteVideoVersionInput extends WriteCurrentVideoInput {
  versionTag: string;
}

export interface WriteFinalCutManifestInput {
  finalCut: FinalCutRecordEntity;
  lines: string[];
}

export interface WriteFinalCutFilesInput {
  finalCut: FinalCutRecordEntity;
  videoContent: Uint8Array;
}

export interface ResolveProjectAssetPathInput {
  projectStorageDir: string;
  assetRelPath: string;
}

export interface PersistSegmentReferenceAudioInput {
  projectStorageDir: string;
  batchId: string;
  sceneId: string;
  segmentId: string;
  audioId: string;
  fileExtension: string;
  content: Uint8Array;
}

export interface PersistSegmentReferenceImageInput {
  projectStorageDir: string;
  batchId: string;
  sceneId: string;
  segmentId: string;
  imageId: string;
  fileExtension: string;
  content: Uint8Array;
}

export interface VideoStorage {
  initializePromptTemplate(input: InitializeVideoPromptTemplateInput): Promise<void> | void;
  readPromptTemplate(input: ReadVideoPromptTemplateInput): Promise<string> | string;
  writePromptSnapshot(input: WriteVideoPromptSnapshotInput): Promise<void> | void;
  writePromptPlan(input: WriteVideoPromptPlanInput): Promise<void> | void;
  writeRawResponse(input: WriteVideoRawResponseInput): Promise<void> | void;
  writeBatchManifest(input: WriteVideoBatchManifestInput): Promise<void> | void;
  writeCurrentVideo(input: WriteCurrentVideoInput): Promise<void> | void;
  writeVideoVersion(input: WriteVideoVersionInput): Promise<void> | void;
  writeFinalCutManifest?(input: WriteFinalCutManifestInput): Promise<void> | void;
  writeFinalCutFiles?(input: WriteFinalCutFilesInput): Promise<void> | void;
  persistSegmentReferenceAudio?(input: PersistSegmentReferenceAudioInput): Promise<string> | string;
  persistSegmentReferenceImage?(input: PersistSegmentReferenceImageInput): Promise<string> | string;
  resolveProjectAssetPath(input: ResolveProjectAssetPathInput): Promise<string> | string;
}
