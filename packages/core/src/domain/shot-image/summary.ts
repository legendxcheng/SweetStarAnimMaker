import type { CurrentImageBatch } from "@sweet-star/shared";

import type {
  SegmentFrameRecordEntity,
  ShotReferenceBatchRecord,
  ShotReferenceRecordEntity,
} from "./types";

export function toCurrentImageBatch(
  batch: Pick<
    ShotReferenceBatchRecord,
    "id" | "sourceShotScriptId" | "shotCount" | "totalRequiredFrameCount" | "updatedAt"
  >,
  records: Array<
    | Pick<ShotReferenceRecordEntity, "referenceStatus">
    | Pick<SegmentFrameRecordEntity, "imageStatus">
  >,
): CurrentImageBatch {
  return {
    id: batch.id,
    sourceShotScriptId: batch.sourceShotScriptId,
    shotCount: batch.shotCount,
    totalRequiredFrameCount: batch.totalRequiredFrameCount,
    approvedShotCount: records.filter((record) =>
      "referenceStatus" in record
        ? record.referenceStatus === "approved"
        : record.imageStatus === "approved",
    ).length,
    updatedAt: batch.updatedAt,
  };
}
