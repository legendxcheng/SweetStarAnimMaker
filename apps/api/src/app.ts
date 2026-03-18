import Fastify from "fastify";
import cors from "@fastify/cors";

import { buildSpec1Services } from "./bootstrap/build-spec1-services";
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
  studioOrigin?: string;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const services = buildSpec1Services({
    workspaceRoot: options.dataRoot ?? process.cwd(),
    taskQueue: options.taskQueue,
    taskIdGenerator: options.taskIdGenerator,
    redisUrl: options.redisUrl,
  });

  const studioOrigin = options.studioOrigin ?? process.env.STUDIO_ORIGIN ?? "http://localhost:5173";

  app.register(cors, {
    origin: studioOrigin,
    credentials: true,
  });

  app.setErrorHandler(createApiErrorHandler());
  registerProjectRoutes(app, services);
  registerStoryboardRoutes(app, services);
  registerTaskRoutes(app, services);
  app.addHook("onClose", async () => {
    await services.close();
  });

  return app;
}
