import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createStoryboardReviewRecord,
  createTaskRecord,
} from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardReviewRepository,
  createSqliteTaskRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { CurrentMasterPlot } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("master plot api", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const baseMasterPlot: CurrentMasterPlot = {
    id: "mp_20260317_ab12cd",
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
    sourceTaskId: "task_20260317_ab12cd",
    updatedAt: "2026-03-17T12:00:00.000Z",
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

    await seedCurrentMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    seedReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlotId: baseMasterPlot.id,
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
        latestReview: expect.objectContaining({
          action: "reject",
          masterPlotId: baseMasterPlot.id,
        }),
        availableActions: {
          save: true,
          approve: true,
          reject: true,
        },
        latestTask: expect.objectContaining({
          id: "task_20260317_ab12cd",
          type: "master_plot_generate",
        }),
      }),
    );
  });

  it("returns 404 when the project has no current master plot", async () => {
    const { app } = await createTempApp();
    const project = await createProject(app);

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/master-plot/review`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("saves the current master plot", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCurrentMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "master_plot_in_review",
    });

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/master-plot`,
      payload: {
        ...baseMasterPlot,
        title: "The Last Sky Choir Revised",
        synopsis: "Rin follows the comet song into the drowned city and finds a way to lift it.",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseMasterPlot.id,
        title: "The Last Sky Choir Revised",
        synopsis:
          "Rin follows the comet song into the drowned city and finds a way to lift it.",
        sourceTaskId: "task_20260317_ab12cd",
        approvedAt: null,
      }),
    );
  });

  it("approves the current master plot", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCurrentMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "master_plot_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/approve`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        action: "approve",
        masterPlotId: baseMasterPlot.id,
      }),
    );

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("master_plot_approved");
    expect(detailResponse.json().currentMasterPlot.approvedAt).toEqual(expect.any(String));
  });

  it("approves the current master plot after migrating a legacy storyboard_reviews table", async () => {
    const { app, tempDir } = await createTempApp({
      legacyStoryboardReviewsTable: true,
    });
    const project = await createProject(app);

    await seedCurrentMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "master_plot_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/approve`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        action: "approve",
        masterPlotId: baseMasterPlot.id,
      }),
    );
  });

  it("rejects the current master plot and triggers regeneration", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260318_cd34ef",
      },
    });
    const project = await createProject(app);

    await seedCurrentMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "master_plot_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/reject`,
      payload: {
        reason: "Need a sharper ending beat.",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        action: "reject",
        masterPlotId: baseMasterPlot.id,
        reason: "Need a sharper ending beat.",
        triggeredTaskId: "task_20260318_cd34ef",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260318_cd34ef",
      queueName: "master-plot-generate",
      taskType: "master_plot_generate",
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("master_plot_generating");
  });

  it("returns 400 when reject is missing a reason", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCurrentMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "master_plot_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/reject`,
      payload: {
        reason: "   ",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  async function createTempApp(options?: {
    legacyStoryboardReviewsTable?: boolean;
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    if (options?.legacyStoryboardReviewsTable) {
      const paths = createLocalDataPaths(tempDir);
      const db = createSqliteDb({ paths });
      db.exec(`
        CREATE TABLE storyboard_reviews (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          storyboard_version_id TEXT NOT NULL,
          action TEXT NOT NULL,
          reason TEXT,
          triggered_task_id TEXT,
          created_at TEXT NOT NULL
        )
      `);
      db.close();
    }

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: options?.taskQueue,
      taskIdGenerator: options?.taskIdGenerator,
    });
    apps.push(app);
    await app.ready();

    return { app, tempDir };
  }

  async function createProject(app: FastifyInstance) {
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });

    return created.json();
  }
});

async function seedCurrentMasterPlot(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  masterPlot: CurrentMasterPlot;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const masterPlotStorage = createStoryboardStorage({ paths });

  await masterPlotStorage.writeCurrentMasterPlot({
    storageDir: input.projectStorageDir,
    masterPlot: input.masterPlot,
  });
  projectRepository.updateCurrentMasterPlot({
    projectId: input.projectId,
    masterPlotId: input.masterPlot.id,
  });
  db.close();
}

function seedReviewWorkspace(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  masterPlotId: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const taskRepository = createSqliteTaskRepository({ db });
  const reviewRepository = createSqliteStoryboardReviewRepository({ db });

  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "master_plot_in_review",
    updatedAt: "2026-03-17T12:10:00.000Z",
  });
  taskRepository.insert(
    createTaskRecord({
      id: "task_20260317_ab12cd",
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      type: "master_plot_generate",
      queueName: "master-plot-generate",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:05:00.000Z",
      status: "succeeded",
      startedAt: "2026-03-17T12:01:00.000Z",
      finishedAt: "2026-03-17T12:05:00.000Z",
    }),
  );
  reviewRepository.insert(
    createStoryboardReviewRecord({
      id: "sbr_20260317_ab12cd",
      projectId: input.projectId,
      masterPlotId: input.masterPlotId,
      action: "reject",
      reason: "Need better pacing.",
      createdAt: "2026-03-17T12:10:00.000Z",
    }),
  );
  db.close();
}

function setProjectStatus(input: {
  tempDir: string;
  projectId: string;
  status: "master_plot_in_review" | "master_plot_approved";
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });

  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.status,
    updatedAt: "2026-03-17T12:10:00.000Z",
  });
  db.close();
}
