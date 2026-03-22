import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// @ts-expect-error runtime env loader lives outside this app tsconfig root
import { loadRootEnv } from "../../../tooling/env/load-env.mjs";

describe("loadRootEnv", () => {
  const tempDirs: string[] = [];
  const originalEnv = new Map<string, string | undefined>();

  afterEach(async () => {
    for (const [key, value] of originalEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    originalEnv.clear();

    await Promise.all(
      tempDirs.splice(0).map((tempDir) =>
        fs.rm(tempDir, { recursive: true, force: true }),
      ),
    );
  });

  it("loads environment variables from a .env file", async () => {
    const envFilePath = await createTempEnvFile([
      "REDIS_URL=redis://127.0.0.1:6380",
      'STORYBOARD_LLM_MODEL="gemini-3.1-pro-preview"',
    ]);

    rememberEnv("REDIS_URL");
    rememberEnv("STORYBOARD_LLM_MODEL");
    delete process.env.REDIS_URL;
    delete process.env.STORYBOARD_LLM_MODEL;

    const result = loadRootEnv({ envFilePath });

    expect(result).toEqual({
      appliedKeys: ["REDIS_URL", "STORYBOARD_LLM_MODEL"],
      envFilePath,
      loaded: true,
    });
    expect(process.env.REDIS_URL).toBe("redis://127.0.0.1:6380");
    expect(process.env.STORYBOARD_LLM_MODEL).toBe("gemini-3.1-pro-preview");
  });

  it("does not override environment variables that are already set", async () => {
    const envFilePath = await createTempEnvFile([
      "REDIS_URL=redis://127.0.0.1:6380",
    ]);

    rememberEnv("REDIS_URL");
    process.env.REDIS_URL = "redis://127.0.0.1:9999";

    const result = loadRootEnv({ envFilePath });

    expect(result).toEqual({
      appliedKeys: [],
      envFilePath,
      loaded: true,
    });
    expect(process.env.REDIS_URL).toBe("redis://127.0.0.1:9999");
  });

  async function createTempEnvFile(lines: string[]) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-env-"));
    tempDirs.push(tempDir);

    const envFilePath = path.join(tempDir, ".env");
    await fs.writeFile(envFilePath, `${lines.join("\n")}\n`, "utf8");

    return envFilePath;
  }

  function rememberEnv(key: string) {
    if (!originalEnv.has(key)) {
      originalEnv.set(key, process.env[key]);
    }
  }
});