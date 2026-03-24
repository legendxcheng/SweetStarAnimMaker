import type {
  SegmentFrameRecordEntity,
  ShotImageBatchRecord,
} from "../domain/shot-image";

export interface ShotImageRepository {
  insertBatch(batch: ShotImageBatchRecord): Promise<void> | void;
  findBatchById(
    batchId: string,
  ): Promise<ShotImageBatchRecord | null> | ShotImageBatchRecord | null;
  findCurrentBatchByProjectId(
    projectId: string,
  ): Promise<ShotImageBatchRecord | null> | ShotImageBatchRecord | null;
  listFramesByBatchId(
    batchId: string,
  ): Promise<SegmentFrameRecordEntity[]> | SegmentFrameRecordEntity[];
  insertFrame(frame: SegmentFrameRecordEntity): Promise<void> | void;
  findFrameById(
    frameId: string,
  ): Promise<SegmentFrameRecordEntity | null> | SegmentFrameRecordEntity | null;
  updateFrame(frame: SegmentFrameRecordEntity): Promise<void> | void;
}
