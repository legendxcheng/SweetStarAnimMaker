import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";
import { startWorker } from "@sweet-star/worker";

import { buildApp } from "../src/app";

describe("spec3 master plot flow", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];
  const dbs: Array<{ close(): void }> = [];
  const workers: Array<{ close(): Promise<void> }> = [];
  const redisServers: RedisMemoryServer[] = [];

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

  it("processes a master-plot task and exposes the review workspace", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec3-flow-"));
    tempDirs.push(tempDir);

    const redisServer = new RedisMemoryServer();
    redisServers.push(redisServer);
    const redisUrl = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;

    const app = buildApp({
      dataRoot: tempDir,
      redisUrl,
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
    });
    apps.push(app);
    await app.ready();

    const createProjectResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });
    const project = createProjectResponse.json();

    const createTaskResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/master-plot-generate`,
    });

    expect(createTaskResponse.statusCode).toBe(201);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl,
      masterPlotProvider: createStubMasterPlotProvider(),
    });
    workers.push(worker);

    await waitFor(async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks/task_20260317_ab12cd",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const row = db
      .prepare("SELECT current_master_plot_id, status FROM projects WHERE id = ?")
      .get(project.id) as
      | {
          current_master_plot_id: string | null;
          status: string;
        }
      | undefined;

    expect(row).toEqual({
      current_master_plot_id: `mp_${project.id.replace(/^proj_/, "")}`,
      status: "master_plot_in_review",
    });

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
    ).resolves.toContain("\"title\": \"The Last Sky Choir\"");

    const projectDetailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });
    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json()).toEqual(
      expect.objectContaining({
        status: "master_plot_in_review",
        currentMasterPlot: expect.objectContaining({
          id: `mp_${project.id.replace(/^proj_/, "")}`,
          title: "The Last Sky Choir",
          sourceTaskId: "task_20260317_ab12cd",
        }),
      }),
    );

    const reviewResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/master-plot/review`,
    });
    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectStatus: "master_plot_in_review",
        currentMasterPlot: expect.objectContaining({
          title: "The Last Sky Choir",
        }),
        latestReview: null,
        latestTask: expect.objectContaining({
          id: "task_20260317_ab12cd",
          status: "succeeded",
        }),
      }),
    );
  });
});

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

function createStubMasterPlotProvider() {
  return {
    async generateMasterPlot() {
      return {
        rawResponse: "{\"title\":\"The Last Sky Choir\"}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        masterPlot: {
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
        },
      };
    },
  };
}
