import type { StoryboardDocument } from "../domain/storyboard";

export interface GenerateStoryboardInput {
  projectId: string;
  script: string;
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
