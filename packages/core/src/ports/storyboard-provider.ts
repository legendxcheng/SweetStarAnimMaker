import type { StoryboardGenerateReviewContext } from "../domain/task";
import type { StoryboardDocument } from "../domain/storyboard";

export interface GenerateStoryboardInput {
  projectId: string;
  script: string;
  reviewContext?: StoryboardGenerateReviewContext;
}

export interface GenerateStoryboardResult {
  rawResponse: unknown;
  storyboard: StoryboardDocument;
  provider: string;
  model: string;
}

export interface LlmStoryboardProvider {
  generateStoryboard(
    input: GenerateStoryboardInput,
  ): Promise<GenerateStoryboardResult> | GenerateStoryboardResult;
}
