import type { CurrentImageBatch } from "@sweet-star/shared";

import type {
  SegmentFrameRecordEntity,
  ShotReferenceBatchRecord,
  ShotReferenceRecordEntity,
} from "./types";

export function toCurrentImageBatch(
  batch: Pick<
    ShotReferenceBatchRecord,
    | "id"
    | "sourceShotScriptId"
    | "shotCount"
    | "segmentCount"
    | "totalRequiredFrameCount"
    | "updatedAt"
  >,
  records: Array<
    | Pick<ShotReferenceRecordEntity, "status" | "referenceStatus">
    | Pick<SegmentFrameRecordEntity, "imageStatus">
  >,
): CurrentImageBatch {
  const segmentCount = batch.segmentCount ?? batch.shotCount;

  return {
    id: batch.id,
    sourceShotScriptId: batch.sourceShotScriptId,
    segmentCount,
    totalRequiredFrameCount: batch.totalRequiredFrameCount,
    approvedSegmentCount: records.filter((record) =>
      "imageStatus" in record
        ? record.imageStatus === "approved"
        : (record.status ?? record.referenceStatus) === "approved",
    ).length,
    updatedAt: batch.updatedAt,
  };
}
