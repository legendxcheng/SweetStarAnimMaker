import type { StoryboardVersionRecord } from "../domain/storyboard";

export interface StoryboardVersionRepository {
  insert(version: StoryboardVersionRecord): Promise<void> | void;
  findCurrentByProjectId(
    projectId: string,
  ): Promise<StoryboardVersionRecord | null> | StoryboardVersionRecord | null;
  getNextVersionNumber?(projectId: string): Promise<number> | number;
}
