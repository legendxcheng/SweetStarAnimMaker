import type { StoryboardDocument, StoryboardVersionRecord } from "../domain/storyboard";

export interface WriteStoryboardRawResponseInput {
  version: StoryboardVersionRecord;
  rawResponse: unknown;
}

export interface WriteStoryboardVersionInput {
  version: StoryboardVersionRecord;
  storyboard: StoryboardDocument;
}

export interface ReadStoryboardVersionInput {
  version: StoryboardVersionRecord;
}

export interface StoryboardStorage {
  writeRawResponse(input: WriteStoryboardRawResponseInput): Promise<void> | void;
  writeStoryboardVersion(input: WriteStoryboardVersionInput): Promise<void> | void;
  readStoryboardVersion(
    input: ReadStoryboardVersionInput,
  ): Promise<StoryboardDocument> | StoryboardDocument;
}
