import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startWorker } from "@sweet-star/worker";
import {
  createLocalDataPaths,
  createSqliteDb,
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

describe("spec3 storyboard flow", () => {
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

  it("processes a storyboard task and exposes the review workspace", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec3-flow-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const redisServer = new RedisMemoryServer();
    redisServers.push(redisServer);
    const redisUrl = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;

    const app = buildApp({
      dataRoot: tempDir,
      redisUrl,
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_storyboard",
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
        url: "/tasks/task_20260321_storyboard",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const row = db
      .prepare("SELECT current_storyboard_id, status FROM projects WHERE id = ?")
      .get(project.id) as
      | {
          current_storyboard_id: string | null;
          status: string;
        }
      | undefined;

    expect(row).toEqual({
      current_storyboard_id: "storyboard_generated",
      status: "storyboard_in_review",
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          project.storageDir,
          "storyboard",
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
        status: "storyboard_in_review",
        currentStoryboard: expect.objectContaining({
          id: "storyboard_generated",
          title: "The Last Sky Choir",
          sourceTaskId: "task_20260321_storyboard",
        }),
      }),
    );

    const reviewResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/review`,
    });
    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectStatus: "storyboard_in_review",
        currentStoryboard: expect.objectContaining({
          title: "The Last Sky Choir",
        }),
        latestTask: expect.objectContaining({
          id: "task_20260321_storyboard",
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
                  characterAction: "Rin looks up toward the comet.",
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
