import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import { createCharacterSheetStorage, createLocalDataPaths } from "../src/index";

describe("character sheet storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("writes the batch manifest, generated prompt files, and current image assets", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-character-sheets-"));
    tempDirs.push(tempDir);

    const storage = createCharacterSheetStorage({
      paths: createLocalDataPaths(tempDir),
    });
    const batch = createCharacterSheetBatchRecord({
      id: "char_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceMasterPlotId: "mp_1",
      characterCount: 1,
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
    });
    const character = createCharacterSheetRecord({
      id: "char_rin_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      batchId: batch.id,
      sourceMasterPlotId: "mp_1",
      characterName: "Rin",
      promptTextGenerated: "silver pilot jacket",
      promptTextCurrent: "silver pilot jacket",
      updatedAt: "2026-03-21T00:00:00.000Z",
    });

    await storage.writeBatchManifest({ batch });
    await storage.writeGeneratedPrompt({
      character,
      promptVariables: { characterName: "Rin" },
    });
    await storage.writeCurrentImage({
      character,
      imageBytes: new Uint8Array([1, 2, 3]),
      metadata: { width: 1536, height: 1024 },
    });

    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "character-sheets",
          "batches",
          "char_batch_v1",
          "manifest.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"characterCount": 1');
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "character-sheets",
          "batches",
          "char_batch_v1",
          "characters",
          "char_rin_1",
          "prompt.generated.txt",
        ),
        "utf8",
      ),
    ).resolves.toBe("silver pilot jacket");
    await expect(
      fs.readFile(
        path.join(
          tempDir,
          ".local-data",
          "projects",
          "proj_1-my-story",
          "character-sheets",
          "batches",
          "char_batch_v1",
          "characters",
          "char_rin_1",
          "current.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"width": 1536');
  });
});
