import type { FastifyInstance } from "fastify";

import {
  rejectShotScriptRequestSchema,
  rejectMasterPlotRequestSchema,
  saveMasterPlotRequestSchema,
  saveShotScriptRequestSchema,
  saveStoryboardRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerStoryboardRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
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

  app.get("/projects/:projectId/shot-script/current", async (request) => {
    const params = request.params as { projectId: string };

    return services.getCurrentShotScript.execute({
      projectId: params.projectId,
    });
  });

  app.get("/projects/:projectId/shot-script/review", async (request) => {
    const params = request.params as { projectId: string };

    return services.getShotScriptReview.execute({
      projectId: params.projectId,
    });
  });

  app.put("/projects/:projectId/shot-script", async (request) => {
    const params = request.params as { projectId: string };
    const payload = saveShotScriptRequestSchema.parse(request.body);

    return services.saveHumanShotScript.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/shot-script/approve", async (request) => {
    const params = request.params as { projectId: string };

    return services.approveShotScript.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/shot-script/reject", async (request) => {
    const params = request.params as { projectId: string };
    const payload = rejectShotScriptRequestSchema.parse(request.body);

    return services.rejectShotScript.execute({
      projectId: params.projectId,
      ...payload,
    });
  });
}
