import type { FastifyInstance } from "fastify";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerStoryboardRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.get("/projects/:projectId/storyboard/current", async (request) => {
    const params = request.params as { projectId: string };

    return services.getCurrentStoryboard.execute({
      projectId: params.projectId,
    });
  });
}
