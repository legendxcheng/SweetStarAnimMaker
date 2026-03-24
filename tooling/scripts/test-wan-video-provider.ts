import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createReferenceImageUploader,
  createWanVideoProvider,
} from "../../packages/services/src/index.ts";
import { loadRootEnv } from "../env/load-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  loadRootEnv();

  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const image = args.image;

  if (!image) {
    printUsage();
    throw new Error("--image is required");
  }

  if (!args.prompt) {
    printUsage();
    throw new Error("--prompt is required");
  }

  const referenceImageUploader = createReferenceImageUploader({
    providerOrder: process.env.IMAGE_UPLOAD_PROVIDER_ORDER?.split(","),
    picgoApiKey: process.env.PICGO_API_KEY,
  });
  const provider = createWanVideoProvider({
    baseUrl: process.env.VECTORENGINE_BASE_URL,
    apiToken: process.env.VECTORENGINE_API_TOKEN,
    modelName: args.modelName ?? process.env.WAN_VIDEO_MODEL ?? "wan2.6-i2v",
    resolution: args.resolution ?? process.env.WAN_VIDEO_RESOLUTION,
    promptExtend:
      typeof args.promptExtend === "boolean"
        ? args.promptExtend
        : parseBooleanEnv(process.env.WAN_VIDEO_PROMPT_EXTEND),
    audio:
      typeof args.audio === "boolean"
        ? args.audio
        : parseBooleanEnv(process.env.WAN_VIDEO_AUDIO),
    timeoutMs: args.requestTimeoutMs,
    referenceImageUploader,
  });

  const submitResult = await provider.submitImageToVideo({
    image: resolveAssetPath(image),
    promptText: args.prompt,
    resolution: args.resolution,
    promptExtend: args.promptExtend,
    audio: args.audio,
  });

  console.log(
    JSON.stringify(
      {
        stage: "submitted",
        taskId: submitResult.taskId,
        status: submitResult.status,
        modelName: submitResult.modelName,
      },
      null,
      2,
    ),
  );

  if (args.noPoll) {
    process.exit(0);
  }

  const startedAt = Date.now();
  const pollIntervalMs = args.pollIntervalMs ?? 10_000;
  const pollTimeoutMs = args.pollTimeoutMs ?? 600_000;
  let lastStatus: string | null = null;

  while (true) {
    const taskResult = await provider.getImageToVideoTask({
      taskId: submitResult.taskId,
    });

    if (taskResult.status !== lastStatus) {
      console.log(
        JSON.stringify(
          {
            stage: "poll",
            taskId: taskResult.taskId,
            status: taskResult.status,
            videoUrl: taskResult.videoUrl,
            errorMessage: taskResult.errorMessage,
          },
          null,
          2,
        ),
      );
      lastStatus = taskResult.status;
    }

    if (taskResult.completed) {
      console.log(
        JSON.stringify(
          {
            stage: "completed",
            taskId: taskResult.taskId,
            status: taskResult.status,
            videoUrl: taskResult.videoUrl,
            errorMessage: taskResult.errorMessage,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    if (taskResult.failed) {
      console.error(
        JSON.stringify(
          {
            stage: "failed",
            taskId: taskResult.taskId,
            status: taskResult.status,
            videoUrl: taskResult.videoUrl,
            errorMessage: taskResult.errorMessage,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }

    if (Date.now() - startedAt >= pollTimeoutMs) {
      throw new Error(
        `Wan video polling timed out after ${pollTimeoutMs}ms for task ${submitResult.taskId}`,
      );
    }

    await delay(pollIntervalMs);
  }
}

function parseArgs(tokens: string[]) {
  const args: {
    audio?: boolean;
    help?: boolean;
    image?: string;
    modelName?: string;
    noPoll?: boolean;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
    prompt?: string;
    promptExtend?: boolean;
    requestTimeoutMs?: number;
    resolution?: string;
  } = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    switch (token) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--image":
        args.image = tokens[index + 1];
        index += 1;
        break;
      case "--prompt":
        args.prompt = tokens[index + 1];
        index += 1;
        break;
      case "--model":
        args.modelName = tokens[index + 1];
        index += 1;
        break;
      case "--resolution":
        args.resolution = tokens[index + 1];
        index += 1;
        break;
      case "--prompt-extend":
        args.promptExtend = true;
        break;
      case "--no-prompt-extend":
        args.promptExtend = false;
        break;
      case "--audio":
        args.audio = true;
        break;
      case "--no-audio":
        args.audio = false;
        break;
      case "--request-timeout-ms":
        args.requestTimeoutMs = Number(tokens[index + 1]);
        index += 1;
        break;
      case "--poll-interval-ms":
        args.pollIntervalMs = Number(tokens[index + 1]);
        index += 1;
        break;
      case "--poll-timeout-ms":
        args.pollTimeoutMs = Number(tokens[index + 1]);
        index += 1;
        break;
      case "--no-poll":
        args.noPoll = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm smoke:wan-video --image <path-or-url> --prompt <text> [options]

Options:
  --model <name>                  Default: wan2.6-i2v
  --resolution <name>
  --prompt-extend
  --no-prompt-extend
  --audio
  --no-audio
  --request-timeout-ms <ms>       Default: provider request timeout disabled
  --poll-interval-ms <ms>         Default: 10000
  --poll-timeout-ms <ms>          Default: 600000
  --no-poll                       Submit only, do not query task status
`);
}

function resolveAssetPath(value: string) {
  if (/^https?:\/\//iu.test(value)) {
    return value;
  }

  return path.resolve(workspaceRoot, value);
}

function parseBooleanEnv(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return undefined;
}

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
