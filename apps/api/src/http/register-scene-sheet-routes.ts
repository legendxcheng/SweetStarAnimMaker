import type { FastifyInstance } from "fastify";
import {
  approveSceneSheetRequestSchema,
  regenerateSceneSheetRequestSchema,
  updateSceneSheetPromptRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerSceneSheetRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.get("/projects/:projectId/scene-sheets", async (request) => {
    const params = request.params as { projectId: string };

    return services.listSceneSheets.execute({
      projectId: params.projectId,
    });
  });

  app.put("/projects/:projectId/scene-sheets/:sceneId/prompt", async (request) => {
    const params = request.params as { projectId: string; sceneId: string };
    const payload = updateSceneSheetPromptRequestSchema.parse(request.body);

    return services.updateSceneSheetPrompt.execute({
      projectId: params.projectId,
      sceneId: params.sceneId,
      ...payload,
    });
  });

  app.post("/projects/:projectId/scene-sheets/:sceneId/regenerate", async (request, reply) => {
    const params = request.params as { projectId: string; sceneId: string };
    regenerateSceneSheetRequestSchema.parse(request.body);
    const task = await services.regenerateSceneSheet.execute({
      projectId: params.projectId,
      sceneId: params.sceneId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/scene-sheets/:sceneId/approve", async (request) => {
    const params = request.params as { projectId: string; sceneId: string };
    approveSceneSheetRequestSchema.parse(request.body);

    return services.approveSceneSheet.execute({
      projectId: params.projectId,
      sceneId: params.sceneId,
    });
  });
}
