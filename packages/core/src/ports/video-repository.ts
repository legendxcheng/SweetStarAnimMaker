import type { ShotVideoRecordEntity, VideoBatchRecord } from "../domain/video";

export interface VideoRepository {
  insertBatch(batch: VideoBatchRecord): Promise<void> | void;
  findBatchById(batchId: string): Promise<VideoBatchRecord | null> | VideoBatchRecord | null;
  findCurrentBatchByProjectId(
    projectId: string,
  ): Promise<VideoBatchRecord | null> | VideoBatchRecord | null;
  listSegmentsByBatchId(
    batchId: string,
  ): Promise<ShotVideoRecordEntity[]> | ShotVideoRecordEntity[];
  insertSegment(segment: ShotVideoRecordEntity): Promise<void> | void;
  findSegmentById(
    segmentId: string,
  ): Promise<ShotVideoRecordEntity | null> | ShotVideoRecordEntity | null;
  findCurrentSegmentByProjectIdAndSegmentId(
    projectId: string,
    segmentId: string,
  ): Promise<ShotVideoRecordEntity | null> | ShotVideoRecordEntity | null;
  findCurrentSegmentByProjectIdAndSceneIdAndSegmentId(
    projectId: string,
    sceneId: string,
    segmentId: string,
  ): Promise<ShotVideoRecordEntity | null> | ShotVideoRecordEntity | null;
  findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId?(
    projectId: string,
    sceneId: string,
    segmentId: string,
    shotId: string,
  ): Promise<ShotVideoRecordEntity | null> | ShotVideoRecordEntity | null;
  updateSegment(segment: ShotVideoRecordEntity): Promise<void> | void;
}
