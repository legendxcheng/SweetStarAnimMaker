import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createFileScriptStorage, createLocalDataPaths } from "../src/index";

describe("file premise storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("writes the premise and creates the containing directories", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-services-"));
    tempDirs.push(tempDir);

    const storage = createFileScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const storageDir = "projects/proj_20260317_ab12cd-my-story";

    const result = await storage.writePremise({
      storageDir,
      premiseText: "Scene 1",
    });

    expect(result).toEqual({
      premiseRelPath: "premise/v1.md",
      premiseBytes: 7,
    });
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_20260317_ab12cd-my-story",
          "premise",
          "v1.md",
        ),
        "utf8",
      ),
    ).resolves.toBe("Scene 1");
  });

  it("overwrites the premise content and preserves the logical path", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-services-"));
    tempDirs.push(tempDir);

    const storage = createFileScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const storageDir = "projects/proj_20260317_ab12cd-my-story";

    await storage.writePremise({
      storageDir,
      premiseText: "Scene 1",
    });
    const result = await storage.writePremise({
      storageDir,
      premiseText: "Updated Scene 1",
    });

    expect(result).toEqual({
      premiseRelPath: "premise/v1.md",
      premiseBytes: 15,
    });
    await expect(storage.readPremise({ storageDir })).resolves.toBe(
      "Updated Scene 1",
    );
  });

  it("reads the legacy script file when the new premise file is missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-services-"));
    tempDirs.push(tempDir);

    const storage = createFileScriptStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const storageDir = "projects/proj_20260317_ab12cd-my-story";
    const legacyScriptPath = path.join(
      tempDir,
      ".local-data",
      "projects",
      "proj_20260317_ab12cd-my-story",
      "script",
      "original.txt",
    );

    await fs.mkdir(path.dirname(legacyScriptPath), { recursive: true });
    await fs.writeFile(legacyScriptPath, "Legacy premise text", "utf8");

    await expect(storage.readPremise({ storageDir })).resolves.toBe(
      "Legacy premise text",
    );
  });
});
