import type { FastifyInstance } from "fastify";

import type { buildSpec1Services } from "../bootstrap/build-spec1-services";

export function registerTaskRoutes(
  app: FastifyInstance,
  services: ReturnType<typeof buildSpec1Services>,
) {
  app.post("/projects/:projectId/tasks/master-plot-generate", async (request, reply) => {
    const params = request.params as { projectId: string };
    const task = await services.createMasterPlotGenerateTask.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/tasks/character-sheets-generate", async (request, reply) => {
    const params = request.params as { projectId: string };
    const task = await services.createCharacterSheetsGenerateTask.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.post("/projects/:projectId/tasks/storyboard-generate", async (request, reply) => {
    const params = request.params as { projectId: string };
    const task = await services.createStoryboardGenerateTask.execute({
      projectId: params.projectId,
    });

    return reply.status(201).send(task);
  });

  app.get("/tasks/:taskId", async (request) => {
    const params = request.params as { taskId: string };

    return services.getTaskDetail.execute({
      taskId: params.taskId,
    });
  });
}
