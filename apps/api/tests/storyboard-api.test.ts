import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createStoryboardReviewRecord,
  createStoryboardVersionRecord,
  createTaskRecord,
} from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardReviewRepository,
  createSqliteStoryboardVersionRepository,
  createSqliteTaskRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";

describe("storyboard api", () => {
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

  it("returns the current storyboard document", async () => {
    const { app } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir: tempDirs[0]!,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/current`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        versionNumber: 1,
        summary: "A short story summary",
        scenes: [
          expect.objectContaining({
            id: "scene_1",
            sceneIndex: 1,
          }),
        ],
      }),
    );
  });

  it("returns 404 when the project has no current storyboard", async () => {
    const { app } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const projectId = created.json().id as string;

    const response = await app.inject({
      method: "GET",
      url: `/projects/${projectId}/storyboard/current`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when the project does not exist", async () => {
    const { app } = await createTempApp();

    const response = await app.inject({
      method: "GET",
      url: "/projects/missing-project/storyboard/current",
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns the storyboard review workspace", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    seedReviewWorkspace({
      tempDir,
      projectId: project.id,
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/storyboard/review`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        projectStatus: "storyboard_in_review",
        currentStoryboard: expect.objectContaining({
          id: "sbv_20260317_ab12cd",
        }),
        latestReview: expect.objectContaining({
          action: "reject",
        }),
        availableActions: {
          saveHumanVersion: true,
          approve: true,
          reject: true,
        },
        latestStoryboardTask: expect.objectContaining({
          id: "task_20260317_ab12cd",
        }),
      }),
    );
  });

  it("saves a human storyboard version", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/save-human-version`,
      payload: {
        baseVersionId: "sbv_20260317_ab12cd",
        summary: "Updated storyboard summary",
        scenes: [
          {
            id: "scene_1",
            sceneIndex: 1,
            description: "A revised opening beat.",
            camera: "wide shot",
            characters: ["A"],
            prompt: "wide shot of character A in a bright studio",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        projectId: project.id,
        versionNumber: 2,
        kind: "human",
        filePath: "storyboards/versions/v2-human.json",
      }),
    );
  });

  it("approves the current storyboard version", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/approve`,
      payload: {
        storyboardVersionId: "sbv_20260317_ab12cd",
        note: "Approved after manual review.",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        action: "approve",
        reason: "Approved after manual review.",
      }),
    );

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });

    expect(detailResponse.json().status).toBe("storyboard_approved");
  });

  it("rejects the current storyboard version for manual editing", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/reject`,
      payload: {
        storyboardVersionId: "sbv_20260317_ab12cd",
        reason: "Need better pacing.",
        nextAction: "edit_manually",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        action: "reject",
        reason: "Need better pacing.",
        triggeredTaskId: null,
      }),
    );
  });

  it("returns 409 for stale storyboard version actions", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/save-human-version`,
      payload: {
        baseVersionId: "sbv_stale",
        summary: "Updated storyboard summary",
        scenes: [],
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when reject is missing a reason", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
      },
    });
    const project = created.json();

    await seedCurrentStoryboard({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
    });
    setProjectStatus({
      tempDir,
      projectId: project.id,
      status: "storyboard_in_review",
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/storyboard/reject`,
      payload: {
        storyboardVersionId: "sbv_20260317_ab12cd",
        reason: "   ",
        nextAction: "edit_manually",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  async function createTempApp() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-"));
    tempDirs.push(tempDir);

    const app = buildApp({ dataRoot: tempDir });
    apps.push(app);
    await app.ready();

    return { app, tempDir };
  }
});

async function seedCurrentStoryboard(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const storyboardVersionRepository = createSqliteStoryboardVersionRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });
  const version = createStoryboardVersionRecord({
    id: "sbv_20260317_ab12cd",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceTaskId: "task_20260317_ab12cd",
    versionNumber: 1,
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    createdAt: "2026-03-17T12:00:00.000Z",
  });

  storyboardVersionRepository.insert(version);
  projectRepository.updateCurrentStoryboardVersion({
    projectId: input.projectId,
    storyboardVersionId: version.id,
  });
  await storyboardStorage.writeStoryboardVersion({
    version,
    storyboard: {
      summary: "A short story summary",
      scenes: [
        {
          id: "scene_1",
          sceneIndex: 1,
          description: "A enters the room",
          camera: "medium shot",
          characters: ["A"],
          prompt: "medium shot, character A entering a dim room",
        },
      ],
    },
  });
  db.close();
}

function seedReviewWorkspace(input: { tempDir: string; projectId: string }) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const taskRepository = createSqliteTaskRepository({ db });
  const reviewRepository = createSqliteStoryboardReviewRepository({ db });

  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "storyboard_in_review",
    updatedAt: "2026-03-17T12:10:00.000Z",
  });
  taskRepository.insert(
    createTaskRecord({
      id: "task_20260317_ab12cd",
      projectId: input.projectId,
      projectStorageDir: `projects/${input.projectId}-my-story`,
      type: "storyboard_generate",
      queueName: "storyboard-generate",
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
      storyboardVersionId: "sbv_20260317_ab12cd",
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
  status: "storyboard_in_review" | "storyboard_approved";
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
