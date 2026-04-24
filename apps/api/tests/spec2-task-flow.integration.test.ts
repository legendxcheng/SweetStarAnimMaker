import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startWorker } from "@sweet-star/worker";
import {
  createLocalDataPaths,
  createSqliteDb,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";
import {
  seedApprovedCharacterSheets,
  seedApprovedMasterPlot,
  seedApprovedSceneSheets,
} from "./storyboard-test-helpers";

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

  it("processes a storyboard task through api, redis, worker, sqlite, and disk", async () => {
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
        generateTaskId: () => "task_20260321_ab12cd",
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
    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedApprovedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const createTaskResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/storyboard-generate`,
    });

    expect(createTaskResponse.statusCode).toBe(201);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl,
      storyboardProvider: createStubStoryboardProvider(),
    });
    workers.push(worker);

    await waitFor(async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks/task_20260321_ab12cd",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const taskDir = path.join(
      tempDir,
      ".local-data",
      project.storageDir,
      "tasks",
      "task_20260321_ab12cd",
    );
    const output = JSON.parse(await fs.readFile(path.join(taskDir, "output.json"), "utf8")) as {
      storyboardId: string;
      sceneCount: number;
      segmentCount: number;
      totalDurationSec: number;
    };

    await expect(fs.readFile(path.join(taskDir, "input.json"), "utf8")).resolves.toContain(
      "\"taskType\": \"storyboard_generate\"",
    );
    expect(output).toEqual({
      storyboardId: "storyboard_generated",
      sceneCount: 1,
      segmentCount: 1,
      totalDurationSec: 6,
    });
    await expect(fs.readFile(path.join(taskDir, "log.txt"), "utf8")).resolves.toContain(
      "storyboard generation succeeded",
    );
    await expect(
      fs.readFile(path.join(taskDir, "prompt-snapshot.json"), "utf8"),
    ).resolves.toContain("\"masterPlot\"");
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


function createStubStoryboardProvider() {
  return {
    async generateStoryboard() {
      return {
        rawResponse: "{\"title\":\"The Last Sky Choir\"}",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          id: "storyboard_generated",
          title: "The Last Sky Choir",
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "pending_source_master_plot_id",
          sourceTaskId: null,
          updatedAt: "pending_updated_at",
          approvedAt: null,
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "Rin Hears The Sky",
              dramaticPurpose: "Trigger the inciting beat.",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "Rain shakes across the cockpit glass.",
                  characterAction: "Rin looks up.",
                  dialogue: "",
                  voiceOver: "That sound again.",
                  audio: "A comet hum under distant thunder.",
                  purpose: "Start the mystery.",
                },
              ],
            },
          ],
        },
      };
    },
  };
}
