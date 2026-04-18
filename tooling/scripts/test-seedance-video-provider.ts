import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSeedanceVideoProvider } from "../../packages/services/src/index.ts";
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

  if (args.images.length === 0 && args.videos.length === 0 && args.draftTaskId == null) {
    printUsage();
    throw new Error("At least one --image or --video or --draft-task-id is required");
  }

  const provider = createSeedanceVideoProvider({
    baseUrl: process.env.SEEDANCE_API_BASE_URL,
    apiToken: process.env.SEEDANCE_API_TOKEN,
    modelName: args.modelName ?? process.env.SEEDANCE_VIDEO_MODEL,
    durationSeconds: args.durationSeconds,
    resolution: args.resolution,
    ratio: args.ratio,
    generateAudio: args.generateAudio,
    returnLastFrame: args.returnLastFrame,
    timeoutMs: args.requestTimeoutMs,
  });

  const submitResult = await provider.submitVideoGenerationTask({
    promptText: args.prompt,
    referenceImages: args.images.map(resolveAssetPath),
    referenceVideos: args.videos.map(resolveAssetPath),
    referenceAudios: args.audios.map(resolveAssetPath),
    draftTaskId: args.draftTaskId,
    durationSeconds: args.durationSeconds,
    resolution: args.resolution,
    ratio: args.ratio,
    generateAudio: args.generateAudio,
    returnLastFrame: args.returnLastFrame,
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
    const taskResult = await provider.getVideoGenerationTask({
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
            lastFrameUrl: taskResult.lastFrameUrl,
            durationSec: taskResult.durationSec,
            generateAudio: taskResult.generateAudio,
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
            lastFrameUrl: taskResult.lastFrameUrl,
            durationSec: taskResult.durationSec,
            generateAudio: taskResult.generateAudio,
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
            lastFrameUrl: taskResult.lastFrameUrl,
            durationSec: taskResult.durationSec,
            generateAudio: taskResult.generateAudio,
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
        `Seedance video polling timed out after ${pollTimeoutMs}ms for task ${submitResult.taskId}`,
      );
    }

    await delay(pollIntervalMs);
  }
}

function parseArgs(tokens: string[]) {
  const args: {
    audios: string[];
    draftTaskId?: string;
    durationSeconds?: number;
    generateAudio?: boolean;
    help?: boolean;
    images: string[];
    modelName?: string;
    noPoll?: boolean;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
    prompt?: string;
    ratio?: string;
    requestTimeoutMs?: number;
    resolution?: string;
    returnLastFrame?: boolean;
    videos: string[];
  } = {
    audios: [],
    images: [],
    videos: [],
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    switch (token) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--image":
        args.images.push(tokens[index + 1] ?? "");
        index += 1;
        break;
      case "--video":
        args.videos.push(tokens[index + 1] ?? "");
        index += 1;
        break;
      case "--audio":
        args.audios.push(tokens[index + 1] ?? "");
        index += 1;
        break;
      case "--draft-task-id":
        args.draftTaskId = tokens[index + 1];
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
      case "--ratio":
        args.ratio = tokens[index + 1];
        index += 1;
        break;
      case "--duration":
        args.durationSeconds = Number(tokens[index + 1]);
        index += 1;
        break;
      case "--generate-audio":
        args.generateAudio = true;
        break;
      case "--no-generate-audio":
        args.generateAudio = false;
        break;
      case "--return-last-frame":
        args.returnLastFrame = true;
        break;
      case "--no-return-last-frame":
        args.returnLastFrame = false;
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
  corepack pnpm smoke:seedance-video --image <path-or-url> [--image <path-or-url> ...] [options]

Options:
  --video <path-or-url>           Repeatable
  --audio <path-or-url>           Repeatable, requires at least one image or video
  --draft-task-id <id>
  --prompt <text>
  --model <name>                  Default: doubao-seedance-2-0-260128
  --resolution <value>            Example: 480p | 720p
  --ratio <value>                 Example: 16:9 | 9:16 | adaptive
  --duration <seconds>
  --generate-audio
  --no-generate-audio
  --return-last-frame
  --no-return-last-frame
  --request-timeout-ms <ms>       Default: 60000
  --poll-interval-ms <ms>         Default: 10000
  --poll-timeout-ms <ms>          Default: 900000
  --no-poll                       Submit only, do not query task status
`);
}

function resolveAssetPath(value: string) {
  if (/^(?:https?:\/\/|asset:\/\/|data:)/iu.test(value)) {
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
