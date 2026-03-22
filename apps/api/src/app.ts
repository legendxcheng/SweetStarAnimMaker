import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

import { buildSpec1Services } from "./bootstrap/build-spec1-services";
import { registerCharacterSheetRoutes } from "./http/register-character-sheet-routes";
import { createApiErrorHandler } from "./http/error-handler";
import { registerProjectRoutes } from "./http/register-project-routes";
import { registerStoryboardRoutes } from "./http/register-storyboard-routes";
import { registerTaskRoutes } from "./http/register-task-routes";
import type { TaskIdGenerator, TaskQueue } from "@sweet-star/core";

export interface BuildAppOptions {
  dataRoot?: string;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
  studioOrigin?: string | string[];
}

const defaultStudioOrigins = [
  "http://127.0.0.1:14273",
  "http://localhost:5173",
];

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const services = buildSpec1Services({
    workspaceRoot: options.dataRoot ?? process.cwd(),
    taskQueue: options.taskQueue,
    taskIdGenerator: options.taskIdGenerator,
    redisUrl: options.redisUrl,
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
  app.register(multipart);

  app.setErrorHandler(createApiErrorHandler());
  registerProjectRoutes(app, services);
  registerCharacterSheetRoutes(app, services);
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
