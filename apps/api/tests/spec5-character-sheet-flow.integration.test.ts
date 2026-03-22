import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { startWorker } from "@sweet-star/worker";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { CurrentMasterPlot } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { RedisMemoryServer } from "redis-memory-server";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("spec5 character-sheet flow", () => {
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

  it("processes batch and per-character tasks through api, redis, worker, sqlite, and disk", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-spec5-flow-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const redisServer = new RedisMemoryServer();
    redisServers.push(redisServer);
    const redisUrl = `redis://${await redisServer.getHost()}:${await redisServer.getPort()}`;

    const app = buildApp({
      dataRoot: tempDir,
      redisUrl,
      taskIdGenerator: {
        generateTaskId: (() => {
          const ids = [
            "task_20260321_character_sheets",
            "task_20260321_char_rin",
            "task_20260321_char_ivo",
          ];

          return () => ids.shift() ?? "task_20260321_extra";
        })(),
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

    const createTaskResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/character-sheets-generate`,
    });

    expect(createTaskResponse.statusCode).toBe(201);

    const worker = await startWorker({
      workspaceRoot: tempDir,
      redisUrl,
      storyboardProvider: {
        async generateStoryboard() {
          return {
            rawResponse: "{\"title\":\"unused storyboard\"}",
            provider: "gemini",
            model: "gemini-3.1-pro-preview",
            storyboard: {
              id: "storyboard_generated",
              title: "unused storyboard",
              episodeTitle: "Episode 1",
              sourceMasterPlotId: "mp_unused",
              sourceTaskId: null,
              updatedAt: "pending_updated_at",
              approvedAt: null,
              scenes: [
                {
                  id: "scene_1",
                  order: 1,
                  name: "Unused",
                  dramaticPurpose: "Unused",
                  segments: [
                    {
                      id: "segment_1",
                      order: 1,
                      durationSec: 1,
                      visual: "Unused",
                      characterAction: "Unused",
                      dialogue: "",
                      voiceOver: "",
                      audio: "",
                      purpose: "Unused",
                    },
                  ],
                },
              ],
            },
          };
        },
      },
      characterSheetPromptProvider: {
        async generateCharacterPrompt({ characterName }) {
          return {
            promptText: `${characterName} prompt from Gemini`,
            rawResponse: `${characterName} prompt from Gemini`,
            provider: "gemini",
            model: "gemini-3.1-pro-preview",
          };
        },
      },
      characterSheetImageProvider: {
        async generateCharacterSheetImage({ characterId, promptText }) {
          return {
            imageBytes: Uint8Array.from([1, 2, 3, characterId.length]),
            width: 1536,
            height: 1024,
            rawResponse: JSON.stringify({ promptText }),
            provider: "turnaround-image",
            model: "imagen-4.0-generate-preview",
          };
        },
      },
    });
    workers.push(worker);

    await waitFor(async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks/task_20260321_character_sheets",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("succeeded");
    });

    await waitFor(async () => {
      const response = await app.inject({
        method: "GET",
        url: `/projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("character_sheets_in_review");
      expect(response.json().currentCharacterSheetBatch).toEqual(
        expect.objectContaining({
          characterCount: 2,
          approvedCharacterCount: 0,
        }),
      );
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/character-sheets`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          id: "char_batch_task_20260321_character_sheets",
          characterCount: 2,
        }),
        characters: expect.arrayContaining([
          expect.objectContaining({
            id: "char_task_20260321_character_sheets_rin_1",
            promptTextGenerated: "Rin prompt from Gemini",
            status: "in_review",
            provider: "turnaround-image",
          }),
          expect.objectContaining({
            id: "char_task_20260321_character_sheets_ivo_2",
            promptTextGenerated: "Ivo prompt from Gemini",
            status: "in_review",
            provider: "turnaround-image",
          }),
        ]),
      }),
    );

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          project.storageDir,
          "character-sheets",
          "batches",
          "char_batch_task_20260321_character_sheets",
          "characters",
          "char_task_20260321_character_sheets_rin_1",
          "current.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"provider\": \"turnaround-image\"");
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

async function seedApprovedMasterPlot(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const masterPlot: CurrentMasterPlot = {
    id: "mp_20260321_ab12cd",
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
    sourceTaskId: "task_20260321_master_plot",
    updatedAt: "2026-03-21T12:00:00.000Z",
    approvedAt: "2026-03-21T12:05:00.000Z",
  };
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });

  await storyboardStorage.writeCurrentMasterPlot({
    storageDir: input.projectStorageDir,
    masterPlot,
  });
  projectRepository.updateCurrentMasterPlot({
    projectId: input.projectId,
    masterPlotId: masterPlot.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "master_plot_approved",
    updatedAt: masterPlot.approvedAt ?? masterPlot.updatedAt,
  });
  db.close();
}
