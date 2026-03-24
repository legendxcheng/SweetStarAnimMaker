import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createKlingVideoProvider,
  createReferenceImageUploader,
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
  const imageTail = args.imageTail;

  if (!image || !imageTail) {
    printUsage();
    throw new Error("--image and --image-tail are required");
  }

  const referenceImageUploader = createReferenceImageUploader({
    providerOrder: process.env.IMAGE_UPLOAD_PROVIDER_ORDER?.split(","),
    picgoApiKey: process.env.PICGO_API_KEY,
  });
  const provider = createKlingVideoProvider({
    baseUrl: process.env.VECTORENGINE_BASE_URL,
    apiToken: process.env.VECTORENGINE_API_TOKEN,
    modelName: args.modelName ?? process.env.KLING_VIDEO_MODEL,
    mode: args.mode ?? process.env.KLING_VIDEO_MODE,
    timeoutMs: args.requestTimeoutMs,
    referenceImageUploader,
  });

  const submitResult = await provider.submitImageToVideo({
    image: resolveAssetPath(image),
    imageTail: resolveAssetPath(imageTail),
    promptText: args.prompt,
    negativePromptText: args.negativePrompt,
    durationSeconds: args.durationSeconds,
    cfgScale: args.cfgScale,
    callbackUrl: args.callbackUrl,
    externalTaskId: args.externalTaskId,
  });

  console.log(
    JSON.stringify(
      {
        stage: "submitted",
        taskId: submitResult.taskId,
        status: submitResult.status,
        modelName: submitResult.modelName,
        mode: submitResult.mode,
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
        `Kling video polling timed out after ${pollTimeoutMs}ms for task ${submitResult.taskId}`,
      );
    }

    await delay(pollIntervalMs);
  }
}

function parseArgs(tokens: string[]) {
  const args: {
    callbackUrl?: string;
    cfgScale?: number;
    durationSeconds?: number;
    externalTaskId?: string;
    help?: boolean;
    image?: string;
    imageTail?: string;
    mode?: string;
    modelName?: string;
    negativePrompt?: string;
    noPoll?: boolean;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
    prompt?: string;
    requestTimeoutMs?: number;
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
      case "--image-tail":
        args.imageTail = tokens[index + 1];
        index += 1;
        break;
      case "--prompt":
        args.prompt = tokens[index + 1];
        index += 1;
        break;
      case "--negative-prompt":
        args.negativePrompt = tokens[index + 1];
        index += 1;
        break;
      case "--model":
        args.modelName = tokens[index + 1];
        index += 1;
        break;
      case "--mode":
        args.mode = tokens[index + 1];
        index += 1;
        break;
      case "--duration":
        args.durationSeconds = Number(tokens[index + 1]);
        index += 1;
        break;
      case "--cfg-scale":
        args.cfgScale = Number(tokens[index + 1]);
        index += 1;
        break;
      case "--callback-url":
        args.callbackUrl = tokens[index + 1];
        index += 1;
        break;
      case "--external-task-id":
        args.externalTaskId = tokens[index + 1];
        index += 1;
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
  corepack pnpm smoke:kling-video --image <path-or-url> --image-tail <path-or-url> [options]

Options:
  --prompt <text>
  --negative-prompt <text>
  --model <name>                  Default: kling-v3
  --mode <name>                   Default: pro
  --duration <seconds>
  --cfg-scale <number>
  --callback-url <url>
  --external-task-id <id>
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

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
