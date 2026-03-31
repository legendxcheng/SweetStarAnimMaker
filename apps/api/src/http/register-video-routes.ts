import type { FastifyInstance } from "fastify";

import {
  approveAllVideoSegmentsRequestSchema,
  approveVideoSegmentRequestSchema,
  finalCutResponseSchema,
  generateFinalCutRequestSchema,
  regenerateAllVideoPromptsRequestSchema,
  regenerateVideoPromptRequestSchema,
  regenerateVideoSegmentRequestSchema,
  saveVideoPromptRequestSchema,
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

  app.post("/projects/:projectId/final-cut/generate", async (request, reply) => {
    const params = request.params as { projectId: string };
    generateFinalCutRequestSchema.parse(request.body ?? {});
    const task = await services.createFinalCutGenerateTask.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.get("/projects/:projectId/final-cut", async (request) => {
    const params = request.params as { projectId: string };
    const response = await services.getFinalCut.execute({
      projectId: params.projectId,
    });

    return finalCutResponseSchema.parse(response);
  });

  app.get("/projects/:projectId/videos", async (request) => {
    const params = request.params as { projectId: string };

    return services.listVideos.execute({
      projectId: params.projectId,
    });
  });

  app.get("/projects/:projectId/videos/segments/:videoId", async (request) => {
    const params = request.params as { projectId: string; videoId: string };

    return services.getVideo.execute({
      projectId: params.projectId,
      videoId: params.videoId,
    });
  });

  app.post("/projects/:projectId/videos/segments/:videoId/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string; videoId: string };
    regenerateVideoSegmentRequestSchema.parse(request.body ?? {});
    const task = await services.regenerateVideoSegment.execute({
      projectId: params.projectId,
      videoId: params.videoId,
    });

    return reply.status(201).send(task);
  });

  app.put("/projects/:projectId/videos/segments/:videoId/prompt", async (request) => {
    const params = request.params as { projectId: string; videoId: string };
    const body = saveVideoPromptRequestSchema.parse(request.body ?? {});

    return services.updateVideoPrompt.execute({
      projectId: params.projectId,
      videoId: params.videoId,
      ...body,
    });
  });

  app.post("/projects/:projectId/videos/segments/:videoId/regenerate-prompt", async (request) => {
    const params = request.params as { projectId: string; videoId: string };
    regenerateVideoPromptRequestSchema.parse(request.body ?? {});

    return services.regenerateVideoPrompt.execute({
      projectId: params.projectId,
      videoId: params.videoId,
    });
  });

  app.post("/projects/:projectId/videos/regenerate-prompts", async (request) => {
    const params = request.params as { projectId: string };
    regenerateAllVideoPromptsRequestSchema.parse(request.body ?? {});

    return services.regenerateAllVideoPrompts.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/videos/segments/:videoId/approve", async (request) => {
    const params = request.params as { projectId: string; videoId: string };
    approveVideoSegmentRequestSchema.parse(request.body ?? {});

    return services.approveVideoSegment.execute({
      projectId: params.projectId,
      videoId: params.videoId,
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
