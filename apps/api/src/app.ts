import Fastify from "fastify";

import { buildSpec1Services } from "./bootstrap/build-spec1-services";
import { createApiErrorHandler } from "./http/error-handler";
import { registerProjectRoutes } from "./http/register-project-routes";

export interface BuildAppOptions {
  dataRoot?: string;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const services = buildSpec1Services({
    workspaceRoot: options.dataRoot ?? process.cwd(),
  });

  app.setErrorHandler(createApiErrorHandler());
  registerProjectRoutes(app, services);
  app.addHook("onClose", async () => {
    services.db.close();
  });

  return app;
}
