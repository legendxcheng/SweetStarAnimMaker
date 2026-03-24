import type { FastifyInstance } from "fastify";

import {
  rejectMasterPlotRequestSchema,
  saveMasterPlotRequestSchema,
  saveStoryboardRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerStoryboardRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.post("/projects/:projectId/master-plot/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string };
    const task = await services.regenerateMasterPlot.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.get("/projects/:projectId/master-plot/review", async (request) => {
    const params = request.params as { projectId: string };

    return services.getMasterPlotReview.execute({
      projectId: params.projectId,
    });
  });

  app.put("/projects/:projectId/master-plot", async (request) => {
    const params = request.params as { projectId: string };
    const payload = saveMasterPlotRequestSchema.parse(request.body);

    return services.saveHumanMasterPlot.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/master-plot/approve", async (request) => {
    const params = request.params as { projectId: string };

    return services.approveMasterPlot.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/master-plot/reject", async (request) => {
    const params = request.params as { projectId: string };
    const payload = rejectMasterPlotRequestSchema.parse(request.body);

    return services.rejectMasterPlot.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

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

  app.put("/projects/:projectId/storyboard", async (request) => {
    const params = request.params as { projectId: string };
    const payload = saveStoryboardRequestSchema.parse(request.body);

    return services.saveHumanStoryboardVersion.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/storyboard/approve", async (request) => {
    const params = request.params as { projectId: string };

    return services.approveStoryboard.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/storyboard/reject", async (request) => {
    const params = request.params as { projectId: string };

    return services.rejectStoryboard.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/storyboard/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string };
    const task = await services.regenerateStoryboard.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });
}
