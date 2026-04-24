import type {
  SegmentFrameRecordEntity,
  SegmentImageRecordEntity,
  ShotReferenceRecordEntity,
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
  listShotsByBatchId?(
    batchId: string,
  ): Promise<ShotReferenceRecordEntity[]> | ShotReferenceRecordEntity[];
  listSegmentsByBatchId?(
    batchId: string,
  ): Promise<SegmentImageRecordEntity[]> | SegmentImageRecordEntity[];
  insertFrame(frame: SegmentFrameRecordEntity): Promise<void> | void;
  insertShot?(shot: ShotReferenceRecordEntity): Promise<void> | void;
  insertSegment?(segment: SegmentImageRecordEntity): Promise<void> | void;
  findFrameById(
    frameId: string,
  ): Promise<SegmentFrameRecordEntity | null> | SegmentFrameRecordEntity | null;
  findShotById?(
    shotId: string,
  ): Promise<ShotReferenceRecordEntity | null> | ShotReferenceRecordEntity | null;
  findSegmentById?(
    segmentId: string,
  ): Promise<SegmentImageRecordEntity | null> | SegmentImageRecordEntity | null;
  updateFrame(frame: SegmentFrameRecordEntity): Promise<void> | void;
  updateShot?(shot: ShotReferenceRecordEntity): Promise<void> | void;
  updateSegment?(segment: SegmentImageRecordEntity): Promise<void> | void;
}
