import type { FastifyInstance } from "fastify";

import {
  approveCharacterSheetRequestSchema,
  regenerateCharacterSheetRequestSchema,
  updateCharacterSheetPromptRequestSchema,
} from "@sweet-star/shared";

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
