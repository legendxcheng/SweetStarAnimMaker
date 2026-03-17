import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { createLocalDataPaths, createSqliteDb } from "@sweet-star/services";

import { buildApp } from "../src/app";

describe("spec1 project flow", () => {
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

  it("creates, updates, and queries a project across http, sqlite, and disk", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-flow-"));
    tempDirs.push(tempDir);

    const app = buildApp({ dataRoot: tempDir });
    apps.push(app);
    await app.ready();

    const createResponse = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        script: "Scene 1",
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
        "SELECT id, storage_dir, script_rel_path, script_bytes FROM projects WHERE id = ?",
      )
      .get(projectId) as
      | {
          id: string;
          storage_dir: string;
          script_rel_path: string;
          script_bytes: number;
        }
      | undefined;

    expect(sqliteRow).toEqual({
      id: projectId,
      storage_dir: created.storageDir,
      script_rel_path: "script/original.txt",
      script_bytes: 7,
    });

    const scriptFilePath = path.join(tempDir, ".local-data", created.storageDir, "script", "original.txt");

    await expect(fs.readFile(scriptFilePath, "utf8")).resolves.toBe("Scene 1");

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/projects/${projectId}/script`,
      payload: {
        script: "Updated Scene 1",
      },
    });
    expect(updateResponse.statusCode).toBe(200);

    await expect(fs.readFile(scriptFilePath, "utf8")).resolves.toBe("Updated Scene 1");

    const updatedRow = db
      .prepare(
        "SELECT script_bytes, updated_at, script_updated_at FROM projects WHERE id = ?",
      )
      .get(projectId) as
      | {
          script_bytes: number;
          updated_at: string;
          script_updated_at: string;
        }
      | undefined;

    expect(updatedRow?.script_bytes).toBe(15);
    expect(updatedRow?.updated_at).toBeTruthy();
    expect(updatedRow?.script_updated_at).toBeTruthy();

    const detailResponse = await app.inject({
      method: "GET",
      url: `/projects/${projectId}`,
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual(
      expect.objectContaining({
        id: projectId,
        script: expect.objectContaining({
          path: "script/original.txt",
          bytes: 15,
        }),
      }),
    );
  });
});
