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
  referenceImages?: Array<string | SeedanceReferenceImageInput> | null;
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

export interface SeedanceReferenceImageInput {
  assetPath: string;
  role?: "reference_image" | "first_frame" | "last_frame" | null;
  semanticRole?: "first_frame" | "last_frame" | null;
  label?: string | null;
}

export interface SubmitSeedanceVideoGenerationTaskResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  rawResponse: string;
  requestAudit?: SeedanceSubmitRequestAudit;
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

export interface SeedanceSubmitReferenceImageAudit {
  alias: string;
  label: string;
  role: "reference_image" | "first_frame" | "last_frame";
  semanticRole: "first_frame" | "last_frame" | null;
  assetPath: string;
  resolvedAsset: {
    kind: "remote_url" | "asset_url" | "data_url" | "local_file";
    mimeType?: string;
    byteLength?: number;
    sha256?: string;
    urlPrefix?: string;
  };
}

export interface SeedanceSubmitRequestAudit {
  model: string;
  duration: number;
  resolution?: string;
  ratio?: string;
  generateAudio?: boolean;
  returnLastFrame?: boolean;
  serviceTier?: string;
  executionExpiresAfterSec?: number;
  safetyIdentifier?: string;
  promptText: string;
  content: Array<{
    type: string;
    role?: string;
    alias?: string;
    label?: string;
    semanticRole?: "first_frame" | "last_frame" | null;
  }>;
  referenceImages: SeedanceSubmitReferenceImageAudit[];
  referenceAudioCount: number;
  referenceVideoCount: number;
  hasDraftTask: boolean;
}

export interface SeedanceStageSubmitAttemptAudit {
  attempt: number;
  status: "submitted" | "failed";
  strategy: "all_reference_images";
  request: SeedanceSubmitRequestAudit;
  taskId?: string;
  providerStatus?: string | null;
  fallbackReason?: string;
  errorMessage?: string;
}

export interface SeedanceStageGenerationAudit {
  attempts: SeedanceStageSubmitAttemptAudit[];
  fallbackApplied: boolean;
  finalAttempt: number | null;
}

export interface CreateSeedanceStageVideoProviderOptions
  extends CreateSeedanceVideoProviderOptions {
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}
