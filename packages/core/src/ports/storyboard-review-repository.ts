import type { StoryboardReviewRecord } from "@sweet-star/shared";

export interface StoryboardReviewRepository {
  insert(review: StoryboardReviewRecord): Promise<void> | void;
  findLatestByProjectId(
    projectId: string,
  ): Promise<StoryboardReviewRecord | null> | StoryboardReviewRecord | null;
}
