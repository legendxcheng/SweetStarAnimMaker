import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

import { buildSpec1Services } from "./bootstrap/build-spec1-services";
import { registerCharacterSheetRoutes } from "./http/register-character-sheet-routes";
import { createApiErrorHandler } from "./http/error-handler";
import { registerImageRoutes } from "./http/register-image-routes";
import { registerProjectRoutes } from "./http/register-project-routes";
import { registerSceneSheetRoutes } from "./http/register-scene-sheet-routes";
import { registerShotScriptRoutes } from "./http/register-shot-script-routes";
import { registerStoryboardRoutes } from "./http/register-storyboard-routes";
import { registerTaskRoutes } from "./http/register-task-routes";
import { registerVideoRoutes } from "./http/register-video-routes";
import type { TaskIdGenerator, TaskQueue, VideoPromptProvider } from "@sweet-star/core";

const multipartFileSizeLimitBytes = 20 * 1024 * 1024;

export interface BuildAppOptions {
  dataRoot?: string;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
  studioOrigin?: string | string[];
  videoPromptProvider?: VideoPromptProvider;
}

const defaultStudioOrigins = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://127.0.0.1:14273",
  "http://localhost:5173",
];

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    bodyLimit: multipartFileSizeLimitBytes,
  });
  const services = buildSpec1Services({
    workspaceRoot: options.dataRoot ?? process.cwd(),
    taskQueue: options.taskQueue,
    taskIdGenerator: options.taskIdGenerator,
    redisUrl: options.redisUrl,
    videoPromptProvider: options.videoPromptProvider,
  });

  const allowedStudioOrigins = new Set(
    parseStudioOrigins(options.studioOrigin ?? process.env.STUDIO_ORIGIN),
  );

  app.register(cors, {
    origin(origin, callback) {
      callback(null, origin !== undefined && allowedStudioOrigins.has(origin));
    },
    credentials: true,
  });
  app.register(multipart, {
    limits: {
      fileSize: multipartFileSizeLimitBytes,
    },
  });

  app.setErrorHandler(createApiErrorHandler());
  registerProjectRoutes(app, services);
  registerCharacterSheetRoutes(app, services);
  registerSceneSheetRoutes(app, services);
  registerImageRoutes(app, services);
  registerVideoRoutes(app, services);
  registerShotScriptRoutes(app, services);
  registerStoryboardRoutes(app, services);
  registerTaskRoutes(app, services);
  app.addHook("onClose", async () => {
    await services.close();
  });

  return app;
}

function parseStudioOrigins(origins: BuildAppOptions["studioOrigin"]): string[] {
  if (Array.isArray(origins)) {
    return origins;
  }

  if (typeof origins === "string") {
    return origins
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  return defaultStudioOrigins;
}
