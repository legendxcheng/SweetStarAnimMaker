import type { SegmentFrameRecord } from "@sweet-star/shared";

import type {
  SegmentFrameRecordEntity,
  ShotImageBatchRecord,
} from "../domain/shot-image";

export interface WriteShotImageBatchManifestInput {
  batch: ShotImageBatchRecord;
}

export interface WriteFramePlanningInput {
  frame: SegmentFrameRecordEntity;
  planning: Record<string, unknown>;
}

export interface WriteFramePromptFilesInput {
  frame: SegmentFrameRecordEntity;
}

export interface WriteFramePromptVersionInput {
  frame: SegmentFrameRecordEntity;
  versionTag: string;
  promptText: string;
  negativePromptText: string | null;
}

export interface WriteCurrentShotImageInput {
  frame: SegmentFrameRecordEntity;
  imageBytes: Uint8Array;
  metadata: Record<string, unknown>;
}

export interface WriteShotImageVersionInput {
  frame: SegmentFrameRecordEntity;
  versionTag: string;
  imageBytes: Uint8Array;
  metadata: Record<string, unknown>;
}

export interface ReadCurrentShotImageInput {
  storageDir: string;
  frameId: string;
}

export interface ShotImageStorage {
  writeBatchManifest(input: WriteShotImageBatchManifestInput): Promise<void> | void;
  writeFramePlanning(input: WriteFramePlanningInput): Promise<void> | void;
  writeFramePromptFiles(input: WriteFramePromptFilesInput): Promise<void> | void;
  writeFramePromptVersion(input: WriteFramePromptVersionInput): Promise<void> | void;
  writeCurrentImage(input: WriteCurrentShotImageInput): Promise<void> | void;
  writeImageVersion(input: WriteShotImageVersionInput): Promise<void> | void;
  readCurrentFrame(
    input: ReadCurrentShotImageInput,
  ): Promise<SegmentFrameRecord | null> | SegmentFrameRecord | null;
}
