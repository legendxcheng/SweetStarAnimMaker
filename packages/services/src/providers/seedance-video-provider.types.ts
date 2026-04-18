export interface CreateSeedanceVideoProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  resolution?: string;
  ratio?: string;
  durationSeconds?: number;
  generateAudio?: boolean;
  returnLastFrame?: boolean;
  serviceTier?: string;
  executionExpiresAfterSec?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface SubmitSeedanceVideoGenerationTaskInput {
  promptText?: string | null;
  referenceImages?: string[] | null;
  referenceVideos?: string[] | null;
  referenceAudios?: string[] | null;
  draftTaskId?: string | null;
  callbackUrl?: string | null;
  resolution?: string | null;
  ratio?: string | null;
  durationSeconds?: number | null;
  generateAudio?: boolean | null;
  returnLastFrame?: boolean | null;
  serviceTier?: string | null;
  executionExpiresAfterSec?: number | null;
  safetyIdentifier?: string | null;
}

export interface SubmitSeedanceVideoGenerationTaskResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  rawResponse: string;
}

export interface GetSeedanceVideoGenerationTaskInput {
  taskId: string;
}

export interface GetSeedanceVideoGenerationTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  lastFrameUrl: string | null;
  errorMessage: string | null;
  durationSec: number | null;
  generateAudio: boolean | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface WaitForSeedanceVideoGenerationTaskInput
  extends GetSeedanceVideoGenerationTaskInput {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface SeedanceVideoProvider {
  submitVideoGenerationTask(
    input: SubmitSeedanceVideoGenerationTaskInput,
  ): Promise<SubmitSeedanceVideoGenerationTaskResult> | SubmitSeedanceVideoGenerationTaskResult;
  getVideoGenerationTask(
    input: GetSeedanceVideoGenerationTaskInput,
  ): Promise<GetSeedanceVideoGenerationTaskResult> | GetSeedanceVideoGenerationTaskResult;
  waitForVideoGenerationTask(
    input: WaitForSeedanceVideoGenerationTaskInput,
  ): Promise<GetSeedanceVideoGenerationTaskResult> | GetSeedanceVideoGenerationTaskResult;
}

export interface CreateSeedanceStageVideoProviderOptions
  extends CreateSeedanceVideoProviderOptions {
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}
