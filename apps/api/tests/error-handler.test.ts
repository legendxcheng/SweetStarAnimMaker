import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";

describe("api error handler", () => {
  const tempDirs: string[] = [];
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(apps.splice(0).map((app) => app.close()));
    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("logs unexpected errors before returning a generic 500", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-errors-"));
    tempDirs.push(tempDir);

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: { enqueue: vi.fn() },
    });
    apps.push(app);

    app.get("/boom", async () => {
      throw new Error("boom");
    });
    await app.ready();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await app.inject({
      method: "GET",
      url: "/boom",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      message: "Internal Server Error",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[api] unhandled request error"),
      expect.any(Error),
    );
  });

  it("returns 413 for multipart files that exceed the upload limit", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-api-errors-"));
    tempDirs.push(tempDir);

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: { enqueue: vi.fn() },
    });
    apps.push(app);

    app.get("/too-large", async () => {
      const error = new Error("request file too large") as Error & {
        code?: string;
        statusCode?: number;
      };
      error.code = "FST_REQ_FILE_TOO_LARGE";
      error.statusCode = 413;
      throw error;
    });
    await app.ready();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await app.inject({
      method: "GET",
      url: "/too-large",
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({
      message: "Uploaded file is too large",
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
