import fs from "node:fs/promises";

import type { FastifyInstance } from "fastify";

import {
  createProjectRequestSchema,
  resetProjectPremiseRequestSchema,
  updateProjectRequestSchema,
} from "@sweet-star/shared";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerProjectRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.get("/projects", async () => {
    return services.listProjects.execute();
  });

  app.post("/projects", async (request, reply) => {
    const payload = createProjectRequestSchema.parse(request.body);
    const project = await services.createProject.execute(payload);

    return reply.status(201).send(project);
  });

  app.get("/projects/:projectId", async (request) => {
    const params = request.params as { projectId: string };

    return services.getProjectDetail.execute({
      projectId: params.projectId,
    });
  });

  app.put("/projects/:projectId", async (request) => {
    const params = request.params as { projectId: string };
    const payload = updateProjectRequestSchema.parse(request.body);

    return services.updateProject.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.put("/projects/:projectId/premise/reset", async (request) => {
    const params = request.params as { projectId: string };
    const payload = resetProjectPremiseRequestSchema.parse(request.body);

    return services.resetProjectPremise.execute({
      projectId: params.projectId,
      ...payload,
    });
  });

  app.get("/projects/:projectId/assets/*", async (request, reply) => {
    const params = request.params as { projectId: string; "*": string };
    const content = await services.getProjectAssetContent.execute({
      projectId: params.projectId,
      assetRelPath: params["*"],
    });

    return reply
      .header("content-type", content.mimeType)
      .send(await fs.readFile(content.filePath));
  });
}
