import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";
import { startWorker } from "@sweet-star/worker";

import { buildApp } from "../src/app";

const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
const tempDirs: string[] = [];
const apps: FastifyInstance[] = [];
const dbs: Array<{ close(): void }> = [];
const workers: Array<{ close(): Promise<void> }> = [];
const redisServers: RedisMemoryServer[] = [];

describe("spec4 master plot review flow", () => {
  afterEach(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.close()));
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(redisServers.splice(0).map((server) => server.stop()));
    for (const db of dbs.splice(0)) {
      db.close();
    }
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("rejects the current master plot and regenerates a new ai version", async () => {
    const { app, tempDir } = await createIntegrationContext([
      "task_20260318_first",
      "task_20260318_regen",
    ]);
    const project = await createProject(app);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl: app.redisUrl,
      masterPlotProvider: createReviewAwareMasterPlotProvider(),
    });
    workers.push(worker);

    const createTaskResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/master-plot-generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260318_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const rejectResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/reject`,
      payload: {
        reason: "Need stronger scene transitions.",
      },
    });

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json().triggeredTaskId).toBe("task_20260318_regen");

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260318_regen",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const projectDetailResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json()).toEqual(
      expect.objectContaining({
        status: "master_plot_in_review",
        currentMasterPlot: expect.objectContaining({
          title: "Regenerated Sky Choir",
          sourceTaskId: "task_20260318_regen",
        }),
      }),
    );

    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const latestReview = db
      .prepare(
        `
          SELECT action, reason, triggered_task_id
          FROM storyboard_reviews
          WHERE project_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `,
      )
      .get(project.id) as
      | { action: string; reason: string; triggered_task_id: string | null }
      | undefined;

    expect(latestReview).toEqual({
      action: "reject",
      reason: "Need stronger scene transitions.",
      triggered_task_id: "task_20260318_regen",
    });
  });

  it("saves a human-edited master plot and approves it", async () => {
    const { app, tempDir } = await createIntegrationContext(["task_20260318_first"]);
    const project = await createProject(app);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl: app.redisUrl,
      masterPlotProvider: createReviewAwareMasterPlotProvider(),
    });
    workers.push(worker);

    const createTaskResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/master-plot-generate`,
    });
    expect(createTaskResponse.statusCode).toBe(201);

    await waitFor(async () => {
      const response = await app.instance.inject({
        method: "GET",
        url: "/tasks/task_20260318_first",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const saveResponse = await app.instance.inject({
      method: "PUT",
      url: `/projects/${project.id}/master-plot`,
      payload: {
        title: "Manual Sky Choir",
        logline: "Rin rewrites fate with a steadier hand.",
        synopsis: "Rin refines the plan and leads the city toward a controlled ascent.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "She must trust others instead of carrying the city alone.",
        emotionalArc: "Rin learns that leadership can be shared.",
        endingBeat: "The city rises because Rin finally lets the choir sing together.",
        targetDurationSec: 510,
      },
    });

    expect(saveResponse.statusCode).toBe(200);
    expect(saveResponse.json()).toEqual(
      expect.objectContaining({
        id: `mp_${project.id.replace(/^proj_/, "")}`,
        title: "Manual Sky Choir",
        approvedAt: null,
      }),
    );

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          project.storageDir,
          "master-plot",
          "current.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"title\": \"Manual Sky Choir\"");

    const approveResponse = await app.instance.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/approve`,
      payload: {},
    });

    expect(approveResponse.statusCode).toBe(200);

    const projectDetailResponse = await app.instance.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json()).toEqual(
      expect.objectContaining({
        status: "master_plot_approved",
        currentMasterPlot: expect.objectContaining({
          id: `mp_${project.id.replace(/^proj_/, "")}`,
          title: "Manual Sky Choir",
          approvedAt: expect.any(String),
        }),
      }),
    );
  });
});

async function createIntegrationContext(taskIds: string[]) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec4-flow-"));
  tempDirs.push(tempDir);

  const redisServer = new RedisMemoryServer();
  redisServers.push(redisServer);
  const redisUrl = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;
  let taskIndex = 0;
  const instance = buildApp({
    dataRoot: tempDir,
    redisUrl,
    taskIdGenerator: {
      generateTaskId: () => taskIds[taskIndex++] ?? `task_generated_${taskIndex}`,
    },
  });
  apps.push(instance);
  await instance.ready();

  return {
    app: {
      instance,
      redisUrl,
    },
    tempDir,
  };
}

async function createProject(app: { instance: FastifyInstance }) {
  const response = await app.instance.inject({
    method: "POST",
    url: "/projects",
    payload: {
      name: "My Story",
      premiseText,
    },
  });

  expect(response.statusCode).toBe(201);

  return response.json();
}

async function waitFor(assertion: () => Promise<void>, timeoutMs = 10000) {
  const startedAt = Date.now();

  for (;;) {
    try {
      await assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

function createReviewAwareMasterPlotProvider() {
  let callCount = 0;

  return {
    async generateMasterPlot() {
      callCount += 1;

      if (callCount > 1) {
        return {
          rawResponse: "{\"title\":\"Regenerated Sky Choir\"}",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
          masterPlot: {
            title: "Regenerated Sky Choir",
            logline: "Rin rebuilds the song with sharper transitions and higher stakes.",
            synopsis:
              "The city hears the comet again, and Rin shapes the chaos into a clearer ascent.",
            mainCharacters: ["Rin", "Ivo"],
            coreConflict:
              "Rin must turn criticism into a stronger collective plan before the city collapses.",
            emotionalArc: "She turns defensiveness into focused leadership.",
            endingBeat: "The second chorus lands and the city rises cleanly.",
            targetDurationSec: 500,
          },
        };
      }

      return {
        rawResponse: "{\"title\":\"Initial Sky Choir\"}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        masterPlot: {
          title: "Initial Sky Choir",
          logline: "Rin hears the comet but the plan lands without enough shape.",
          synopsis:
            "Rin begins the ascent, but the turning points still feel blunt and underdeveloped.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict:
            "She struggles to align the city's survival with her own unresolved bitterness.",
          emotionalArc: "Rin moves from numbness toward responsibility.",
          endingBeat: "The first chorus lifts the city, but the landing feels incomplete.",
          targetDurationSec: 480,
        },
      };
    },
  };
}
