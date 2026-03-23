import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("spec1 project flow", () => {
  const premiseText = "A washed-up pilot discovers a singing comet above a drowned city.";
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];
  const dbs: Array<{ close(): void }> = [];

  afterEach(async () => {
    for (const db of dbs.splice(0)) {
      db.close();
    }

    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("creates and queries a project across http, sqlite, and disk", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-flow-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const app = buildApp({ dataRoot: tempDir });
    apps.push(app);
    await app.ready();

    const createResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const created = createResponse.json();
    const projectId = created.id as string;
    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });
    dbs.push(db);

    const sqliteRow = db
      .prepare(
        "SELECT id, storage_dir, premise_rel_path, premise_bytes, current_master_plot_id FROM projects WHERE id = ?",
      )
      .get(projectId) as
      | {
          id: string;
          storage_dir: string;
          premise_rel_path: string;
          premise_bytes: number;
          current_master_plot_id: string | null;
        }
      | undefined;

    expect(sqliteRow).toEqual({
      id: projectId,
      storage_dir: created.storageDir,
      premise_rel_path: "premise/v1.md",
      premise_bytes: Buffer.byteLength(premiseText, "utf8"),
      current_master_plot_id: null,
    });

    const premiseFilePath = path.join(tempDir, ".local-data", created.storageDir, "premise", "v1.md");

    await expect(fs.readFile(premiseFilePath, "utf8")).resolves.toBe(premiseText);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual(
      expect.objectContaining({
        id: projectId,
        currentMasterPlot: null,
        premise: {
          path: "premise/v1.md",
          bytes: Buffer.byteLength(premiseText, "utf8"),
          text: premiseText,
          updatedAt: expect.any(String),
        },
      }),
    );
  });
});
