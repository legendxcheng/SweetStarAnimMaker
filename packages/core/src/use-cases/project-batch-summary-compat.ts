import type { CurrentImageBatch, CurrentVideoBatchSummary, ShotVideoRecord } from "@sweet-star/shared";

import type {
  SegmentFrameRecordEntity,
  ShotImageBatchRecord,
  ShotReferenceRecordEntity,
} from "../domain/shot-image";
import { toCurrentImageBatch } from "../domain/shot-image";
import type { VideoBatchRecord } from "../domain/video";
import { toCurrentVideoBatchSummary } from "../domain/video";

type ImageSummaryRecord =
  | Pick<ShotReferenceRecordEntity, "status" | "referenceStatus">
  | Pick<SegmentFrameRecordEntity, "imageStatus">;

type CompatibleImageBatch = Pick<ShotImageBatchRecord, "id" | "sourceShotScriptId" | "updatedAt"> &
  Partial<
    Pick<
      ShotImageBatchRecord,
      "shotCount" | "totalRequiredFrameCount" | "segmentCount" | "totalFrameCount"
    >
  >;

type CompatibleVideoBatch = Pick<
  VideoBatchRecord,
  "id" | "sourceImageBatchId" | "sourceShotScriptId" | "updatedAt"
> &
  Partial<Pick<VideoBatchRecord, "shotCount" | "segmentCount">>;

export function toCompatibleCurrentImageBatch(
  batch: CompatibleImageBatch,
  records: ImageSummaryRecord[],
): CurrentImageBatch | null {
  const segmentCount = firstPositiveNumber(batch.segmentCount, batch.shotCount);
  const totalRequiredFrameCount = firstPositiveNumber(
    batch.totalRequiredFrameCount,
    batch.totalFrameCount,
  );

  if (segmentCount === null || totalRequiredFrameCount === null) {
    return null;
  }

  return toCurrentImageBatch(
    {
      id: batch.id,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotCount: segmentCount,
      segmentCount,
      totalRequiredFrameCount,
      updatedAt: batch.updatedAt,
    },
    records,
  );
}

export function toCompatibleCurrentVideoBatchSummary(
  batch: CompatibleVideoBatch,
  shots: Pick<ShotVideoRecord, "status">[],
): CurrentVideoBatchSummary | null {
  const shotCount = firstPositiveNumber(batch.shotCount, batch.segmentCount, shots.length);

  if (shotCount === null) {
    return null;
  }

  return toCurrentVideoBatchSummary(
    {
      id: batch.id,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotCount,
      updatedAt: batch.updatedAt,
    },
    shots,
  );
}

function firstPositiveNumber(...values: Array<number | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && value > 0) {
      return value;
    }
  }

  return null;
}
