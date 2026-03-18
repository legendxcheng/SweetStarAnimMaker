import type { StoryboardVersionRecord } from "../domain/storyboard";

export interface StoryboardVersionRepository {
  insert(version: StoryboardVersionRecord): Promise<void> | void;
  findById(
    storyboardVersionId: string,
  ): Promise<StoryboardVersionRecord | null> | StoryboardVersionRecord | null;
  findCurrentByProjectId(
    projectId: string,
  ): Promise<StoryboardVersionRecord | null> | StoryboardVersionRecord | null;
  getNextVersionNumber?(projectId: string): Promise<number> | number;
}
