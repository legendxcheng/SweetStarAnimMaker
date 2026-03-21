import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";

describe("cors api", () => {
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

  it("allows the default local studio origin for preflight requests", async () => {
    const app = await createTempApp();

    const response = await app.inject({
      method: "OPTIONS",
      url: "/projects",
      headers: {
        origin: "http://127.0.0.1:14273",
        "access-control-request-method": "GET",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:14273");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("omits CORS headers for origins outside the local allowlist", async () => {
    const app = await createTempApp();

    const response = await app.inject({
      method: "OPTIONS",
      url: "/projects",
      headers: {
        origin: "http://evil.example",
        "access-control-request-method": "GET",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  async function createTempApp() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-cors-api-"));
    tempDirs.push(tempDir);

    const app = buildApp({ dataRoot: tempDir });
    apps.push(app);
    await app.ready();

    return app;
  }
});
