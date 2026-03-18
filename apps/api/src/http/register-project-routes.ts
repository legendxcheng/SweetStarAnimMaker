import type { FastifyInstance } from "fastify";

import {
  createProjectRequestSchema,
  updateProjectScriptRequestSchema,
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

  app.put("/projects/:projectId/script", async (request) => {
    const params = request.params as { projectId: string };
    const payload = updateProjectScriptRequestSchema.parse(request.body);

    return services.updateProjectScript.execute({
      projectId: params.projectId,
      script: payload.script,
    });
  });
}
