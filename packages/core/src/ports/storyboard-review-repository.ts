import type { MasterPlotReviewSummary } from "@sweet-star/shared";

export interface StoryboardReviewRepository {
  insert(review: MasterPlotReviewSummary): Promise<void> | void;
  findLatestByProjectId(
    projectId: string,
  ): Promise<MasterPlotReviewSummary | null> | MasterPlotReviewSummary | null;
}
