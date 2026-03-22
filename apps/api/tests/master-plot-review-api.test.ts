import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createTaskRecord } from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteTaskRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { CurrentMasterPlot } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("master plot review api", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const baseMasterPlot: CurrentMasterPlot = {
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
    approvedAt: null,
  };
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("returns the master-plot review workspace", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedMasterPlotReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/master-plot/review`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectStatus: "master_plot_in_review",
        currentMasterPlot: expect.objectContaining({
          id: baseMasterPlot.id,
          title: baseMasterPlot.title,
        }),
        latestReview: null,
        availableActions: {
          save: true,
          approve: true,
          reject: true,
        },
        latestTask: expect.objectContaining({
          id: "task_20260321_master_plot",
          type: "master_plot_generate",
        }),
      }),
    );
  });

  it("saves the current master plot", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedMasterPlotReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/master-plot`,
      payload: {
        ...baseMasterPlot,
        title: "The Last Sky Choir Revised",
        mainCharacters: ["Rin", "Ivo", "Mara"],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseMasterPlot.id,
        title: "The Last Sky Choir Revised",
        approvedAt: null,
      }),
    );
  });

  it("approves the current master plot", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedMasterPlotReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/approve`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseMasterPlot.id,
        approvedAt: expect.any(String),
      }),
    );
  });

  it("rejects the current master plot and triggers regeneration", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_regen",
      },
    });
    const project = await createProject(app);

    await seedMasterPlotReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/reject`,
      payload: {
        reason: "Need a stronger ending beat.",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260321_regen",
        type: "master_plot_generate",
      }),
    );
  });

  async function createTempApp(options?: Parameters<typeof buildApp>[0]) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const app = buildApp({ dataRoot: tempDir, ...options });
    apps.push(app);
    await app.ready();

    return { app, tempDir };
  }

  async function createProject(app: FastifyInstance) {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });

    return response.json() as { id: string; storageDir: string };
  }

  async function seedMasterPlotReviewWorkspace(input: {
    tempDir: string;
    projectId: string;
    projectStorageDir: string;
    masterPlot: CurrentMasterPlot;
  }) {
    const paths = createLocalDataPaths(input.tempDir);
    const db = createSqliteDb({ paths });
    const projectRepository = createSqliteProjectRepository({ db });
    const taskRepository = createSqliteTaskRepository({ db });
    const storyboardStorage = createStoryboardStorage({ paths });
    const task = createTaskRecord({
      id: "task_20260321_master_plot",
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      type: "master_plot_generate",
      queueName: "master-plot-generate",
      createdAt: "2026-03-21T11:50:00.000Z",
    });

    taskRepository.insert({
      ...task,
      status: "succeeded",
      updatedAt: "2026-03-21T12:00:00.000Z",
      startedAt: "2026-03-21T11:52:00.000Z",
      finishedAt: "2026-03-21T12:00:00.000Z",
    });
    await storyboardStorage.writeCurrentMasterPlot({
      storageDir: input.projectStorageDir,
      masterPlot: input.masterPlot,
    });
    projectRepository.updateCurrentMasterPlot({
      projectId: input.projectId,
      masterPlotId: input.masterPlot.id,
    });
    projectRepository.updateStatus({
      projectId: input.projectId,
      status: "master_plot_in_review",
      updatedAt: input.masterPlot.updatedAt,
    });
    db.close();
  }
});
