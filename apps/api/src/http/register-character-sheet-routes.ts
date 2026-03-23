import fs from "node:fs/promises";

import type { FastifyInstance } from "fastify";

import { ProjectValidationError } from "@sweet-star/core";
import {
  approveCharacterSheetRequestSchema,
  regenerateCharacterSheetRequestSchema,
  updateCharacterSheetPromptRequestSchema,
} from "@sweet-star/shared";
import type {} from "@fastify/multipart";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerCharacterSheetRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.get("/projects/:projectId/character-sheets", async (request) => {
    const params = request.params as { projectId: string };

    return services.listCharacterSheets.execute({
      projectId: params.projectId,
    });
  });

  app.get("/projects/:projectId/character-sheets/:characterId", async (request) => {
    const params = request.params as { projectId: string; characterId: string };

    return services.getCharacterSheet.execute({
      projectId: params.projectId,
      characterId: params.characterId,
    });
  });

  app.get("/projects/:projectId/character-sheets/:characterId/content", async (request, reply) => {
    const params = request.params as { projectId: string; characterId: string };
    const content = await services.getCharacterSheetImageContent.execute({
      projectId: params.projectId,
      characterId: params.characterId,
    });

    return reply
      .header("content-type", content.mimeType)
      .send(await fs.readFile(content.filePath));
  });

  app.post("/projects/:projectId/character-sheets/:characterId/reference-images", async (request) => {
    const params = request.params as { projectId: string; characterId: string };
    const files = [];

    for await (const part of request.files()) {
      if (!part.mimetype.startsWith("image/")) {
        throw new ProjectValidationError(`Unsupported reference image mime type: ${part.mimetype}`);
      }

      const contentBytes = await part.toBuffer();
      files.push({
        originalFileName: part.filename,
        mimeType: part.mimetype,
        sizeBytes: contentBytes.byteLength,
        contentBytes,
      });
    }

    if (files.length === 0) {
      throw new ProjectValidationError("At least one image file is required");
    }

    return services.addCharacterSheetReferenceImages.execute({
      projectId: params.projectId,
      characterId: params.characterId,
      files,
    });
  });

  app.delete(
    "/projects/:projectId/character-sheets/:characterId/reference-images/:referenceImageId",
    async (request) => {
      const params = request.params as {
        projectId: string;
        characterId: string;
        referenceImageId: string;
      };

      return services.deleteCharacterSheetReferenceImage.execute({
        projectId: params.projectId,
        characterId: params.characterId,
        referenceImageId: params.referenceImageId,
      });
    },
  );

  app.get(
    "/projects/:projectId/character-sheets/:characterId/reference-images/:referenceImageId/content",
    async (request, reply) => {
      const params = request.params as {
        projectId: string;
        characterId: string;
        referenceImageId: string;
      };
      const content = await services.getCharacterSheetReferenceImageContent.execute({
        projectId: params.projectId,
        characterId: params.characterId,
        referenceImageId: params.referenceImageId,
      });

      return reply
        .header("content-type", content.mimeType)
        .send(await fs.readFile(content.filePath));
    },
  );

  app.put("/projects/:projectId/character-sheets/:characterId/prompt", async (request) => {
    const params = request.params as { projectId: string; characterId: string };
    const payload = updateCharacterSheetPromptRequestSchema.parse(request.body);

    return services.updateCharacterSheetPrompt.execute({
      projectId: params.projectId,
      characterId: params.characterId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/character-sheets/:characterId/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string; characterId: string };
    regenerateCharacterSheetRequestSchema.parse(request.body);
    const task = await services.regenerateCharacterSheet.execute({
      projectId: params.projectId,
      characterId: params.characterId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/character-sheets/:characterId/approve", async (request) => {
    const params = request.params as { projectId: string; characterId: string };
    approveCharacterSheetRequestSchema.parse(request.body);

    return services.approveCharacterSheet.execute({
      projectId: params.projectId,
      characterId: params.characterId,
    });
  });
}
