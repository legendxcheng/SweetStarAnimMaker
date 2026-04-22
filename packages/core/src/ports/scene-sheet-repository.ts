import type {
  SceneSheetBatchRecord,
  SceneSheetRecordEntity,
} from "../domain/scene-sheet";

export interface SceneSheetRepository {
  insertBatch(batch: SceneSheetBatchRecord): Promise<void> | void;
  findBatchById(
    batchId: string,
  ): Promise<SceneSheetBatchRecord | null> | SceneSheetBatchRecord | null;
  listScenesByBatchId(
    batchId: string,
  ): Promise<SceneSheetRecordEntity[]> | SceneSheetRecordEntity[];
  insertScene(scene: SceneSheetRecordEntity): Promise<void> | void;
  findSceneById(
    sceneId: string,
  ): Promise<SceneSheetRecordEntity | null> | SceneSheetRecordEntity | null;
  updateScene(scene: SceneSheetRecordEntity): Promise<void> | void;
}
