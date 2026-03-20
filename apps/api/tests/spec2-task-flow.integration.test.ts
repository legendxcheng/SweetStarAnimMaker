import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { startWorker } from "@sweet-star/worker";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("spec2 task flow", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];
  const workers: Array<{ close(): Promise<void> }> = [];
  const redisServers: RedisMemoryServer[] = [];

  afterEach(async () => {
    await Promise.all(workers.splice(0).map((worker) => worker.close()));
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(redisServers.splice(0).map((server) => server.stop()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("processes a master-plot task through api, redis, worker, sqlite, and disk", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec2-flow-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

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

    const taskDir = path.join(
      tempDir,
      ".local-data",
      project.storageDir,
      "tasks",
      "task_20260317_ab12cd",
    );
    const output = JSON.parse(await fs.readFile(path.join(taskDir, "output.json"), "utf8")) as {
      masterPlotId: string;
      provider: string;
      model: string;
      promptTemplateKey: string;
    };

    await expect(fs.readFile(path.join(taskDir, "input.json"), "utf8")).resolves.toContain(
      "\"taskType\": \"master_plot_generate\"",
    );
    expect(output).toEqual({
      masterPlotId: `mp_${project.id.replace(/^proj_/, "")}`,
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      promptTemplateKey: "master_plot.generate",
    });
    await expect(fs.readFile(path.join(taskDir, "log.txt"), "utf8")).resolves.toContain(
      "master plot generation succeeded",
    );
    await expect(
      fs.readFile(path.join(taskDir, "prompt-snapshot.json"), "utf8"),
    ).resolves.toContain("\"premiseText\"");
    await expect(
      fs.readFile(path.join(taskDir, "raw-response.txt"), "utf8"),
    ).resolves.toContain("\"title\":\"The Last Sky Choir\"");
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
