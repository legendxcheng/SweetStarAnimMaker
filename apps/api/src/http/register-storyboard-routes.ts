import type { FastifyInstance } from "fastify";

import {
  approveStoryboardRequestSchema,
  rejectStoryboardRequestSchema,
  saveHumanStoryboardVersionRequestSchema,
} from "@sweet-star/shared";

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

  app.get("/projects/:projectId/storyboard/review", async (request) => {
    const params = request.params as { projectId: string };

    return services.getStoryboardReview.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/storyboard/save-human-version", async (request) => {
    const params = request.params as { projectId: string };
    const payload = saveHumanStoryboardVersionRequestSchema.parse(request.body);

    return services.saveHumanStoryboardVersion.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/storyboard/approve", async (request) => {
    const params = request.params as { projectId: string };
    const payload = approveStoryboardRequestSchema.parse(request.body);

    return services.approveStoryboard.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/storyboard/reject", async (request) => {
    const params = request.params as { projectId: string };
    const payload = rejectStoryboardRequestSchema.parse(request.body);

    return services.rejectStoryboard.execute({
      projectId: params.projectId,
      ...payload,
    });
  });
}
