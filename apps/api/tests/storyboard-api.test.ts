import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createStoryboardVersionRecord } from "@sweet-star/core";
import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteStoryboardVersionRepository,
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
    const app = await createTempApp();
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
    const app = await createTempApp();
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
    const app = await createTempApp();

    const response = await app.inject({
      method: "GET",
      url: "/projects/missing-project/storyboard/current",
    });

    expect(response.statusCode).toBe(404);
  });

  async function createTempApp() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-"));
    tempDirs.push(tempDir);

    const app = buildApp({ dataRoot: tempDir });
    apps.push(app);
    await app.ready();

    return app;
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
