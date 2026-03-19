import type { FastifyInstance } from "fastify";

import {
  approveMasterPlotRequestSchema,
  rejectMasterPlotRequestSchema,
  saveMasterPlotRequestSchema,
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

  app.get("/projects/:projectId/master-plot/review", async (request) => {
    const params = request.params as { projectId: string };

    return services.getStoryboardReview.execute({
      projectId: params.projectId,
    });
  });

  app.put("/projects/:projectId/master-plot", async (request) => {
    const params = request.params as { projectId: string };
    const payload = saveMasterPlotRequestSchema.parse(request.body);

    return services.saveHumanStoryboardVersion.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/master-plot/approve", async (request) => {
    const params = request.params as { projectId: string };
    const payload = approveMasterPlotRequestSchema.parse(request.body);

    return services.approveStoryboard.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/master-plot/reject", async (request) => {
    const params = request.params as { projectId: string };
    const payload = rejectMasterPlotRequestSchema.parse(request.body);

    return services.rejectStoryboard.execute({
      projectId: params.projectId,
      ...payload,
    });
  });
}
