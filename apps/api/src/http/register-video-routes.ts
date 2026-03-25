import type { FastifyInstance } from "fastify";

import {
  approveAllVideoSegmentsRequestSchema,
  approveVideoSegmentRequestSchema,
  regenerateVideoSegmentRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerVideoRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.post("/projects/:projectId/videos/generate", async (request, reply) => {
    const params = request.params as { projectId: string };
    regenerateVideoSegmentRequestSchema.parse(request.body ?? {});
    const task = await services.createVideosGenerateTask.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.get("/projects/:projectId/videos", async (request) => {
    const params = request.params as { projectId: string };

    return services.listVideos.execute({
      projectId: params.projectId,
    });
  });

  app.get("/projects/:projectId/videos/segments/:segmentId", async (request) => {
    const params = request.params as { projectId: string; segmentId: string };

    return services.getVideo.execute({
      projectId: params.projectId,
      segmentId: params.segmentId,
    });
  });

  app.post("/projects/:projectId/videos/segments/:segmentId/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string; segmentId: string };
    regenerateVideoSegmentRequestSchema.parse(request.body ?? {});
    const task = await services.regenerateVideoSegment.execute({
      projectId: params.projectId,
      segmentId: params.segmentId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/videos/segments/:segmentId/approve", async (request) => {
    const params = request.params as { projectId: string; segmentId: string };
    approveVideoSegmentRequestSchema.parse(request.body ?? {});

    return services.approveVideoSegment.execute({
      projectId: params.projectId,
      segmentId: params.segmentId,
    });
  });

  app.post("/projects/:projectId/videos/approve-all", async (request) => {
    const params = request.params as { projectId: string };
    approveAllVideoSegmentsRequestSchema.parse(request.body ?? {});

    return services.approveAllVideoSegments.execute({
      projectId: params.projectId,
    });
  });
}
