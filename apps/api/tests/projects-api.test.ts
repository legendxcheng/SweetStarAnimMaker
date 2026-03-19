import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createLocalDataPaths, createSqliteDb, createSqliteProjectRepository } from "@sweet-star/services";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";

describe("projects api", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
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

  it("creates a project and returns premise metadata", async () => {
    const { app } = await createTempApp();

    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: expect.stringContaining("proj_"),
        name: "My Story",
        slug: "my-story",
        status: "premise_ready",
        currentMasterPlot: null,
        premise: {
          path: "premise/v1.md",
          bytes: Buffer.byteLength(premiseText, "utf8"),
          updatedAt: expect.any(String),
        },
      }),
    );
  });

  it("returns 400 for an invalid create payload", async () => {
    const { app } = await createTempApp();

    const response = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "   ",
        premiseText: "   ",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("gets an existing project by id", async () => {
    const { app } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });
    const projectId = created.json().id as string;

    const response = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: projectId,
        currentMasterPlot: null,
        premise: expect.objectContaining({
          path: "premise/v1.md",
          bytes: Buffer.byteLength(premiseText, "utf8"),
        }),
      }),
    );
  });

  it("returns 404 for a missing project", async () => {
    const { app } = await createTempApp();

    const response = await app.inject({
      method: "GET",
      url: "/projects/missing-project",
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns expanded master-plot workflow statuses from project detail", async () => {
    const { app, tempDir } = await createTempApp();
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });
    const projectId = created.json().id as string;
    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    const repository = createSqliteProjectRepository({ db });

    repository.updateStatus({
      projectId,
      status: "master_plot_in_review",
      updatedAt: "2026-03-18T12:00:00.000Z",
    });
    db.close();

    const response = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("master_plot_in_review");
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
