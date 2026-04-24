import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
  createSceneSheetBatchRecord,
  createSceneSheetRecord,
} from "@sweet-star/core";
import {
  createSqliteCharacterSheetRepository,
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteSceneSheetRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { CurrentMasterPlot } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("scene sheets api", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
  });

  it("creates a scene-sheet batch task", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_scene_batch",
      },
    });
    const project = await createProject(app);

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

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/tasks/scene-sheets-generate`,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260321_scene_batch",
        type: "scene_sheets_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260321_scene_batch",
      queueName: "scene-sheets-generate",
      taskType: "scene_sheets_generate",
    });
  });

  it("lists current scene sheets for a project", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "scene_sheets_approved",
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/scene-sheets`,
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          id: "scene_batch_v1",
          sceneCount: 2,
          approvedSceneCount: 1,
        }),
      }),
    );
    expect(payload.scenes).toHaveLength(2);
    expect(payload.scenes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scene_clinic_2",
          sceneName: "诊所走廊",
          status: "approved",
        }),
        expect.objectContaining({
          id: "scene_core_1",
          sceneName: "暴雨码头",
          status: "in_review",
        }),
      ]),
    );
  });

  it("updates a scene prompt", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "scene_sheets_in_review",
    });

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/scene-sheets/scene_core_1/prompt`,
      payload: {
        promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水，远处吊机剪影。",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "scene_core_1",
        promptTextCurrent:
          "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影，湿滑地面积水，远处吊机剪影。",
      }),
    );
  });

  it("regenerates one scene sheet and enqueues an image task", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260422_scene_regen",
      },
    });
    const project = await createProject(app);

    await seedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "scene_sheets_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/scene-sheets/scene_core_1/regenerate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260422_scene_regen",
        type: "scene_sheet_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260422_scene_regen",
      queueName: "scene-sheet-generate",
      taskType: "scene_sheet_generate",
    });
  });

  it("approves the final scene and moves the project to scene_sheets_approved", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedSceneSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "scene_sheets_in_review",
      sceneOverrides: [
        {
          id: "scene_core_1",
          sceneName: "暴雨码头",
          scenePurpose: "开场的外部环境锚点。",
          promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
          constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
          status: "in_review",
          approvedAt: null,
        },
      ],
    });

    const approveResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/scene-sheets/scene_core_1/approve`,
      payload: {},
    });

    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json()).toEqual(
      expect.objectContaining({
        id: "scene_core_1",
        status: "approved",
        approvedAt: expect.any(String),
      }),
    );

    const projectDetailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });
    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json().status).toBe("scene_sheets_approved");
  });

  async function createTempApp(options?: {
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-scene-sheets-api-"));
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

async function seedApprovedCharacterSheets(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const characterSheetRepository = createSqliteCharacterSheetRepository({ db });

  characterSheetRepository.insertBatch(
    createCharacterSheetBatchRecord({
      id: "char_batch_approved",
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      sourceMasterPlotId: "mp_20260321_ab12cd",
      characterCount: 1,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:05:00.000Z",
    }),
  );
  characterSheetRepository.insertCharacter({
    ...createCharacterSheetRecord({
      id: "char_rin_approved",
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      batchId: "char_batch_approved",
      sourceMasterPlotId: "mp_20260321_ab12cd",
      characterName: "Rin",
      promptTextGenerated: "silver pilot jacket",
      promptTextCurrent: "silver pilot jacket",
      imageAssetPath:
        "character-sheets/batches/char_batch_approved/characters/char_rin_approved/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "turnaround-image",
      model: "seedream",
      referenceImages: [],
      updatedAt: "2026-03-21T12:05:00.000Z",
    }),
    status: "approved",
    approvedAt: "2026-03-21T12:05:00.000Z",
    sourceTaskId: "task_char_rin_approved",
  });

  projectRepository.updateCurrentCharacterSheetBatch({
    projectId: input.projectId,
    batchId: "char_batch_approved",
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "character_sheets_approved",
    updatedAt: "2026-03-21T12:06:00.000Z",
  });
  db.close();
}

async function seedSceneSheets(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  status: "scene_sheets_generating" | "scene_sheets_in_review" | "scene_sheets_approved";
  sceneOverrides?: Array<{
    id: string;
    sceneName: string;
    scenePurpose: string;
    promptTextGenerated: string;
    promptTextCurrent: string;
    constraintsText: string;
    status: "generating" | "in_review" | "approved" | "failed";
    approvedAt: string | null;
  }>;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const sceneSheetRepository = createSqliteSceneSheetRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });

  const masterPlot: CurrentMasterPlot = {
    id: "mp_20260321_ab12cd",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis:
      "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "Rin turns the comet's music into a rising tide of light.",
    targetDurationSec: 480,
    sourceTaskId: "task_20260321_master_plot",
    updatedAt: "2026-03-21T12:00:00.000Z",
    approvedAt: "2026-03-21T12:05:00.000Z",
  };
  await storyboardStorage.writeCurrentMasterPlot({
    storageDir: input.projectStorageDir,
    masterPlot,
  });

  const batch = createSceneSheetBatchRecord({
    id: "scene_batch_v1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceMasterPlotId: masterPlot.id,
    sourceCharacterSheetBatchId: "char_batch_approved",
    sceneCount: input.sceneOverrides?.length ?? 2,
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T12:00:00.000Z",
  });
  sceneSheetRepository.insertBatch(batch);

  const scenes =
    input.sceneOverrides?.map((scene) =>
      createSceneSheetRecord({
        id: scene.id,
        projectId: input.projectId,
        projectStorageDir: input.projectStorageDir,
        batchId: batch.id,
        sourceMasterPlotId: masterPlot.id,
        sourceCharacterSheetBatchId: "char_batch_approved",
        sceneName: scene.sceneName,
        scenePurpose: scene.scenePurpose,
        promptTextGenerated: scene.promptTextGenerated,
        promptTextCurrent: scene.promptTextCurrent,
        constraintsText: scene.constraintsText,
        imageAssetPath: `scene-sheets/batches/scene_batch_v1/scenes/${scene.id}/current.png`,
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "seedream",
        status: scene.status,
        updatedAt: "2026-03-21T12:00:00.000Z",
        approvedAt: scene.approvedAt,
        sourceTaskId: `task_${scene.id}`,
      }),
    ) ?? [
      createSceneSheetRecord({
        id: "scene_core_1",
        projectId: input.projectId,
        projectStorageDir: input.projectStorageDir,
        batchId: batch.id,
        sourceMasterPlotId: masterPlot.id,
        sourceCharacterSheetBatchId: "char_batch_approved",
        sceneName: "暴雨码头",
        scenePurpose: "开场的外部环境锚点。",
        promptTextGenerated: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
        promptTextCurrent: "废旧集装箱码头，暴雨夜，冷蓝霓虹倒影。",
        constraintsText: "保持码头结构、远处吊机轮廓、暴雨夜氛围。",
        imageAssetPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_core_1/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "seedream",
        status: "in_review",
        updatedAt: "2026-03-21T12:00:00.000Z",
        approvedAt: null,
        sourceTaskId: "task_scene_1",
      }),
      createSceneSheetRecord({
        id: "scene_clinic_2",
        projectId: input.projectId,
        projectStorageDir: input.projectStorageDir,
        batchId: batch.id,
        sourceMasterPlotId: masterPlot.id,
        sourceCharacterSheetBatchId: "char_batch_approved",
        sceneName: "诊所走廊",
        scenePurpose: "揭示段的重要室内环境。",
        promptTextGenerated: "老旧私人诊所走廊，夜晚冷白顶灯，空旷安静。",
        promptTextCurrent: "老旧私人诊所走廊，夜晚冷白顶灯，空旷安静。",
        constraintsText: "保持窄走廊、冷白顶灯、旧门牌与夜间空旷感。",
        imageAssetPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_clinic_2/current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "turnaround-image",
        model: "seedream",
        status: "approved",
        updatedAt: "2026-03-21T12:00:00.000Z",
        approvedAt: "2026-03-21T12:05:00.000Z",
        sourceTaskId: "task_scene_2",
      }),
    ];

  for (const scene of scenes) {
    sceneSheetRepository.insertScene(scene);
  }

  projectRepository.updateCurrentMasterPlot({
    projectId: input.projectId,
    masterPlotId: masterPlot.id,
  });
  projectRepository.updateCurrentCharacterSheetBatch({
    projectId: input.projectId,
    batchId: "char_batch_approved",
  });
  projectRepository.updateCurrentSceneSheetBatch?.({
    projectId: input.projectId,
    batchId: batch.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.status,
    updatedAt: "2026-03-21T12:06:00.000Z",
  });

  db.close();
}
