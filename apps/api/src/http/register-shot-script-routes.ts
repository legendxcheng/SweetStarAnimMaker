import type { FastifyInstance } from "fastify";

import {
  approveAllShotScriptSegmentsRequestSchema,
  approveShotScriptSegmentRequestSchema,
  regenerateShotScriptSegmentRequestSchema,
  saveShotScriptSegmentRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerShotScriptRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
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

  app.put("/projects/:projectId/shot-script/segments/:segmentId", async (request) => {
    const params = request.params as { projectId: string; segmentId: string };
    const payload = saveShotScriptSegmentRequestSchema.parse(request.body);

    return services.saveHumanShotScriptSegment.execute({
      projectId: params.projectId,
      segmentId: params.segmentId,
      ...payload,
    });
  });

  app.post(
    "/projects/:projectId/shot-script/segments/:segmentId/regenerate",
    async (request, reply) => {
      const params = request.params as { projectId: string; segmentId: string };
      regenerateShotScriptSegmentRequestSchema.parse(request.body);
      const task = await services.regenerateShotScriptSegment.execute({
        projectId: params.projectId,
        segmentId: params.segmentId,
      });

      return reply.status(201).send(task);
    },
  );

  app.post("/projects/:projectId/shot-script/segments/:segmentId/approve", async (request) => {
    const params = request.params as { projectId: string; segmentId: string };
    approveShotScriptSegmentRequestSchema.parse(request.body);

    return services.approveShotScriptSegment.execute({
      projectId: params.projectId,
      segmentId: params.segmentId,
    });
  });

  app.post("/projects/:projectId/shot-script/approve-all", async (request) => {
    const params = request.params as { projectId: string };
    approveAllShotScriptSegmentsRequestSchema.parse(request.body);

    return services.approveAllShotScriptSegments.execute({
      projectId: params.projectId,
    });
  });
}
