import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createReferenceImageUploader,
  createSoraVideoProvider,
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
  const provider = createSoraVideoProvider({
    baseUrl: process.env.VECTORENGINE_BASE_URL,
    apiToken: process.env.VECTORENGINE_API_TOKEN,
    modelName: args.modelName ?? process.env.SORA_VIDEO_MODEL,
    orientation: args.orientation ?? process.env.SORA_VIDEO_ORIENTATION,
    size: args.size ?? process.env.SORA_VIDEO_SIZE,
    durationSeconds: args.durationSeconds,
    timeoutMs: args.requestTimeoutMs,
    referenceImageUploader,
  });

  const submitResult = await provider.submitImageToVideo({
    image: resolveAssetPath(image),
    imageTail: resolveAssetPath(imageTail),
    promptText: args.prompt ?? "make animate",
    orientation: args.orientation,
    size: args.size,
    durationSeconds: args.durationSeconds,
    watermark: args.watermark,
    private: args.private,
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
  const pollTimeoutMs = args.pollTimeoutMs ?? 900_000;
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
            thumbnailUrl: taskResult.thumbnailUrl,
            enhancedPrompt: taskResult.enhancedPrompt,
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
            thumbnailUrl: taskResult.thumbnailUrl,
            enhancedPrompt: taskResult.enhancedPrompt,
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
            thumbnailUrl: taskResult.thumbnailUrl,
            enhancedPrompt: taskResult.enhancedPrompt,
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
        `Sora video polling timed out after ${pollTimeoutMs}ms for task ${submitResult.taskId}`,
      );
    }

    await delay(pollIntervalMs);
  }
}

function parseArgs(tokens: string[]) {
  const args: {
    durationSeconds?: number;
    help?: boolean;
    image?: string;
    imageTail?: string;
    modelName?: string;
    noPoll?: boolean;
    orientation?: string;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
    private?: boolean;
    prompt?: string;
    requestTimeoutMs?: number;
    size?: string;
    watermark?: boolean;
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
      case "--model":
        args.modelName = tokens[index + 1];
        index += 1;
        break;
      case "--orientation":
        args.orientation = tokens[index + 1];
        index += 1;
        break;
      case "--size":
        args.size = tokens[index + 1];
        index += 1;
        break;
      case "--duration":
        args.durationSeconds = Number(tokens[index + 1]);
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
      case "--watermark":
        args.watermark = true;
        break;
      case "--no-watermark":
        args.watermark = false;
        break;
      case "--private":
        args.private = true;
        break;
      case "--public":
        args.private = false;
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
  corepack pnpm smoke:sora-video --image <path-or-url> --image-tail <path-or-url> [options]

Options:
  --prompt <text>                 Default: make animate
  --model <name>                  Default: sora-2-all
  --orientation <name>            Default: portrait
  --size <name>                   Default: large
  --duration <seconds>            Default: 15
  --watermark                     Force watermark=true
  --no-watermark                  Force watermark=false
  --private                       Force private=true
  --public                        Force private=false
  --request-timeout-ms <ms>       Default: provider request timeout disabled
  --poll-interval-ms <ms>         Default: 10000
  --poll-timeout-ms <ms>          Default: 900000
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
