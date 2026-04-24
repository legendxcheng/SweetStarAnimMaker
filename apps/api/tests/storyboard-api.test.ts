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
import type { CurrentMasterPlot, CurrentStoryboard } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";
import {
  seedApprovedCharacterSheets,
  seedApprovedSceneSheets,
} from "./storyboard-test-helpers";

describe("storyboard api", () => {
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
    approvedAt: "2026-03-21T12:05:00.000Z",
  };
  const baseStoryboard: CurrentStoryboard = {
    id: "storyboard_20260321_ab12cd",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp_20260321_ab12cd",
    sourceTaskId: "task_20260321_storyboard",
    updatedAt: "2026-03-21T12:10:00.000Z",
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

  it("returns the storyboard review workspace", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    await seedStoryboardReviewWorkspace({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      storyboard: baseStoryboard,
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/review`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectName: "My Story",
        projectStatus: "storyboard_in_review",
        currentStoryboard: expect.objectContaining({
          id: baseStoryboard.id,
          title: baseStoryboard.title,
        }),
        availableActions: {
          save: true,
          approve: true,
          reject: true,
        },
        latestTask: expect.objectContaining({
          id: "task_20260321_storyboard",
          type: "storyboard_generate",
        }),
      }),
    );
  });

  it("returns 404 when the project has no current storyboard", async () => {
    const { app } = await createTempApp();
    const project = await createProject(app);

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/review`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("saves the current storyboard", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    await seedApprovedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      storyboard: baseStoryboard,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/storyboard`,
      payload: {
        ...baseStoryboard,
        title: "The Last Sky Choir Revised",
        scenes: [
          {
            ...baseStoryboard.scenes[0],
            dramaticPurpose: "Sharpen the inciting beat.",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseStoryboard.id,
        title: "The Last Sky Choir Revised",
        sourceTaskId: "task_20260321_storyboard",
        approvedAt: null,
      }),
    );
  });

  it("approves the current storyboard", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    await seedApprovedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      storyboard: baseStoryboard,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/approve`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: baseStoryboard.id,
        approvedAt: expect.any(String),
      }),
    );

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("storyboard_approved");
    expect(detailResponse.json().currentStoryboard.approvedAt).toEqual(expect.any(String));
  });

  it("regenerates the master plot while master-plot generation is already running", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_master_plot_regen",
      },
    });
    const project = await createProject(app);

    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
    });
    await updateProjectStatus({
      tempDir,
      projectId: project.id,
      status: "master_plot_generating",
      updatedAt: "2026-03-21T12:06:00.000Z",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/master-plot/regenerate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260321_master_plot_regen",
        type: "master_plot_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260321_master_plot_regen",
      queueName: "master-plot-generate",
      taskType: "master_plot_generate",
    });
  });

  it("regenerates the storyboard while a later stage is already generating", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_storyboard_regen",
      },
    });
    const project = await createProject(app);

    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
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
    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      storyboard: baseStoryboard,
      status: "images_generating",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/regenerate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260321_storyboard_regen",
        type: "storyboard_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260321_storyboard_regen",
      queueName: "storyboard-generate",
      taskType: "storyboard_generate",
    });
  });

  it("rejects the current storyboard and triggers regeneration", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_regen",
      },
    });
    const project = await createProject(app);

    await seedApprovedMasterPlot({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      masterPlot: baseMasterPlot,
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
    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      storyboard: baseStoryboard,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/reject`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260321_regen",
        type: "storyboard_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260321_regen",
      queueName: "storyboard-generate",
      taskType: "storyboard_generate",
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("storyboard_generating");
  });

  async function createTempApp(options?: {
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

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

async function seedApprovedMasterPlot(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  masterPlot: CurrentMasterPlot;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });

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
    status: "master_plot_approved",
    updatedAt: input.masterPlot.approvedAt ?? input.masterPlot.updatedAt,
  });
  db.close();
}

async function seedCurrentStoryboard(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  storyboard: CurrentStoryboard;
  status:
    | "storyboard_in_review"
    | "storyboard_approved"
    | "storyboard_generating"
    | "images_generating";
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });

  await storyboardStorage.writeCurrentStoryboard({
    storageDir: input.projectStorageDir,
    storyboard: input.storyboard,
  });
  projectRepository.updateCurrentStoryboard({
    projectId: input.projectId,
    storyboardId: input.storyboard.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.status,
    updatedAt: input.storyboard.updatedAt,
  });
  db.close();
}

async function updateProjectStatus(input: {
  tempDir: string;
  projectId: string;
  status:
    | "master_plot_generating"
    | "storyboard_generating"
    | "images_generating";
  updatedAt: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });

  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.status,
    updatedAt: input.updatedAt,
  });
  db.close();
}

async function seedStoryboardReviewWorkspace(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  storyboard: CurrentStoryboard;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const taskRepository = createSqliteTaskRepository({ db });

  taskRepository.insert(
    createTaskRecord({
      id: "task_20260321_storyboard",
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      type: "storyboard_generate",
      queueName: "storyboard-generate",
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:05:00.000Z",
      status: "succeeded",
      startedAt: "2026-03-21T12:01:00.000Z",
      finishedAt: "2026-03-21T12:05:00.000Z",
    }),
  );
  db.close();

  await seedCurrentStoryboard({
    tempDir: input.tempDir,
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    storyboard: input.storyboard,
    status: "storyboard_in_review",
  });
}
