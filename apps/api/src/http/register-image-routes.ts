import type { FastifyInstance } from "fastify";

import {
  approveAllImageFramesRequestSchema,
  approveImageFrameRequestSchema,
  generateImageFrameRequestSchema,
  regenerateImageFramePromptRequestSchema,
  updateImageFramePromptRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerImageRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.post("/projects/:projectId/images/generate", async (request, reply) => {
    const params = request.params as { projectId: string };
    generateImageFrameRequestSchema.parse(request.body ?? {});
    const task = await services.createImagesGenerateTask.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/images/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string };
    generateImageFrameRequestSchema.parse(request.body ?? {});
    const task = await services.regenerateImages.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/images/regenerate-prompts", async (request, reply) => {
    const params = request.params as { projectId: string };
    regenerateImageFramePromptRequestSchema.parse(request.body ?? {});
    const response = await services.regenerateAllFramePrompts.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(response);
  });

  app.get("/projects/:projectId/images", async (request) => {
    const params = request.params as { projectId: string };

    return services.listImages.execute({
      projectId: params.projectId,
    });
  });

  app.post("/projects/:projectId/images/approve-all", async (request) => {
    const params = request.params as { projectId: string };
    approveAllImageFramesRequestSchema.parse(request.body);

    return services.approveAllImageFrames.execute({
      projectId: params.projectId,
    });
  });

  app.get("/projects/:projectId/images/frames/:frameId", async (request) => {
    const params = request.params as { projectId: string; frameId: string };

    return services.getImageFrame.execute({
      projectId: params.projectId,
      frameId: params.frameId,
    });
  });

  app.put("/projects/:projectId/images/frames/:frameId/prompt", async (request) => {
    const params = request.params as { projectId: string; frameId: string };
    const payload = updateImageFramePromptRequestSchema.parse(request.body);

    return services.updateFramePrompt.execute({
      projectId: params.projectId,
      frameId: params.frameId,
      ...payload,
    });
  });

  app.post(
    "/projects/:projectId/images/frames/:frameId/regenerate-prompt",
    async (request, reply) => {
      const params = request.params as { projectId: string; frameId: string };
      regenerateImageFramePromptRequestSchema.parse(request.body);
      const task = await services.regenerateFramePrompt.execute({
        projectId: params.projectId,
        frameId: params.frameId,
      });

      return reply.status(201).send(task);
    },
  );

  app.post("/projects/:projectId/images/frames/:frameId/generate", async (request, reply) => {
    const params = request.params as { projectId: string; frameId: string };
    generateImageFrameRequestSchema.parse(request.body);
    const task = await services.generateFrameImage.execute({
      projectId: params.projectId,
      frameId: params.frameId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/images/frames/:frameId/approve", async (request) => {
    const params = request.params as { projectId: string; frameId: string };
    approveImageFrameRequestSchema.parse(request.body);

    return services.approveImageFrame.execute({
      projectId: params.projectId,
      frameId: params.frameId,
    });
  });
}
