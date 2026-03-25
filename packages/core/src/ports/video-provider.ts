export interface GenerateSegmentVideoInput {
  projectId: string;
  segmentId: string;
  promptText: string;
  startFramePath: string;
  endFramePath: string;
  durationSec?: number | null;
  model?: string | null;
}

export interface GenerateSegmentVideoResult {
  provider: string;
  model: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  rawResponse: string;
  durationSec: number | null;
}

export interface VideoProvider {
  generateSegmentVideo(
    input: GenerateSegmentVideoInput,
  ): Promise<GenerateSegmentVideoResult> | GenerateSegmentVideoResult;
}
