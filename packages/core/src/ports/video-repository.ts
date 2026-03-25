import type { SegmentVideoRecordEntity, VideoBatchRecord } from "../domain/video";

export interface VideoRepository {
  insertBatch(batch: VideoBatchRecord): Promise<void> | void;
  findBatchById(batchId: string): Promise<VideoBatchRecord | null> | VideoBatchRecord | null;
  findCurrentBatchByProjectId(
    projectId: string,
  ): Promise<VideoBatchRecord | null> | VideoBatchRecord | null;
  listSegmentsByBatchId(
    batchId: string,
  ): Promise<SegmentVideoRecordEntity[]> | SegmentVideoRecordEntity[];
  insertSegment(segment: SegmentVideoRecordEntity): Promise<void> | void;
  findSegmentById(
    segmentId: string,
  ): Promise<SegmentVideoRecordEntity | null> | SegmentVideoRecordEntity | null;
  findCurrentSegmentByProjectIdAndSegmentId(
    projectId: string,
    segmentId: string,
  ): Promise<SegmentVideoRecordEntity | null> | SegmentVideoRecordEntity | null;
  updateSegment(segment: SegmentVideoRecordEntity): Promise<void> | void;
}
