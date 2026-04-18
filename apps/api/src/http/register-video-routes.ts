import type { FastifyInstance } from "fastify";

import { ProjectValidationError } from "@sweet-star/core";
import {
  approveAllVideoSegmentsRequestSchema,
  approveVideoSegmentRequestSchema,
  finalCutResponseSchema,
  generateFinalCutRequestSchema,
  referenceAudioUploadMetadataRequestSchema,
  regenerateAllVideoPromptsRequestSchema,
  regenerateVideoPromptRequestSchema,
  regenerateVideoSegmentRequestSchema,
  saveSegmentVideoConfigRequestSchema,
  saveVideoPromptRequestSchema,
} from "@sweet-star/shared";
import type {} from "@fastify/multipart";

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

  app.post("/projects/:projectId/videos/segments/:videoId/generate", async (request, reply) => {
    const params = request.params as { projectId: string; videoId: string };
    regenerateVideoSegmentRequestSchema.parse(request.body ?? {});
    const task = await services.regenerateVideoSegment.execute({
      projectId: params.projectId,
      videoId: params.videoId,
    });

    return reply.status(201).send(task);
  });

  app.put("/projects/:projectId/videos/segments/:videoId/config", async (request) => {
    const params = request.params as { projectId: string; videoId: string };
    const body = saveSegmentVideoConfigRequestSchema.parse(request.body ?? {});

    return services.saveSegmentVideoConfig.execute({
      projectId: params.projectId,
      videoId: params.videoId,
      ...body,
    });
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

  app.post("/projects/:projectId/videos/segments/:videoId/reference-audios", async (request) => {
    const params = request.params as { projectId: string; videoId: string };
    let audioFile:
      | {
          fileName: string;
          mimeType: string;
          content: Uint8Array;
        }
      | null = null;
    const fields: {
      label?: string | null;
      durationSec?: number | null;
    } = {};

    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (!part.mimetype.startsWith("audio/")) {
          throw new ProjectValidationError(`Unsupported reference audio mime type: ${part.mimetype}`);
        }

        const content = await part.toBuffer();
        audioFile = {
          fileName: part.filename,
          mimeType: part.mimetype,
          content: new Uint8Array(content),
        };
        continue;
      }

      if (part.fieldname === "label" && typeof part.value === "string") {
        fields.label = part.value.trim() || null;
      }

      if (part.fieldname === "durationSec" && typeof part.value === "string") {
        fields.durationSec = Number(part.value);
      }
    }

    if (!audioFile) {
      throw new ProjectValidationError("Reference audio file is required");
    }

    const metadata = referenceAudioUploadMetadataRequestSchema.parse({
      fileName: audioFile.fileName,
      mimeType: audioFile.mimeType,
      bytes: audioFile.content.byteLength,
      ...fields,
    });

    return services.uploadSegmentVideoAudio.execute({
      projectId: params.projectId,
      videoId: params.videoId,
      fileName: metadata.fileName,
      content: audioFile.content,
      label: metadata.label,
      durationSec: metadata.durationSec,
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
