import type { ShotScriptReviewSummary } from "@sweet-star/shared";

export interface ShotScriptReviewRepository {
  insert(review: ShotScriptReviewSummary): Promise<void> | void;
  findLatestByProjectId(
    projectId: string,
  ): Promise<ShotScriptReviewSummary | null> | ShotScriptReviewSummary | null;
}
