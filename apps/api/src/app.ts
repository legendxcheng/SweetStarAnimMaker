import Fastify from "fastify";

import { buildSpec1Services } from "./bootstrap/build-spec1-services";
import { createApiErrorHandler } from "./http/error-handler";
import { registerProjectRoutes } from "./http/register-project-routes";
import { registerTaskRoutes } from "./http/register-task-routes";
import type { TaskIdGenerator, TaskQueue } from "@sweet-star/core";

export interface BuildAppOptions {
  dataRoot?: string;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const services = buildSpec1Services({
    workspaceRoot: options.dataRoot ?? process.cwd(),
    taskQueue: options.taskQueue,
    taskIdGenerator: options.taskIdGenerator,
    redisUrl: options.redisUrl,
  });

  app.setErrorHandler(createApiErrorHandler());
  registerProjectRoutes(app, services);
  registerTaskRoutes(app, services);
  app.addHook("onClose", async () => {
    await services.close();
  });

  return app;
}
