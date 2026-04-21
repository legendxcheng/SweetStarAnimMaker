import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createCharacterSheetBatchRecord, createCharacterSheetRecord } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import { createCharacterSheetStorage, createLocalDataPaths } from "../src/index";

describe("character sheet reference image storage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("writes reference image files and manifest entries", async () => {
    const { storage, character, tempDir } = await createFixture(tempDirs);

    const referenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    });

    expect(referenceImages).toEqual([
      {
        id: "ref_001",
        fileName: "ref-001.png",
        originalFileName: "rin-face.png",
        mimeType: "image/png",
        sizeBytes: 3,
        createdAt: "2026-03-22T12:00:00.000Z",
      },
    ]);
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
          "references",
          "ref-001.png",
        ),
      ),
    ).resolves.toEqual(Buffer.from([1, 2, 3]));
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
          "references",
          "manifest.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"fileName": "ref-001.png"');
  });

  it("deletes a reference image file and rewrites the manifest", async () => {
    const { storage, character, tempDir } = await createFixture(tempDirs);

    const referenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
        {
          originalFileName: "rin-pose.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 4,
          contentBytes: new Uint8Array([4, 5, 6, 7]),
          createdAt: "2026-03-22T12:01:00.000Z",
        },
      ],
    });

    const remainingReferenceImages = await storage.deleteReferenceImage({
      character,
      referenceImageId: referenceImages[0]!.id,
    });

    expect(remainingReferenceImages).toEqual([
      {
        id: "ref_002",
        fileName: "ref-002.jpg",
        originalFileName: "rin-pose.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 4,
        createdAt: "2026-03-22T12:01:00.000Z",
      },
    ]);
    await expect(
      fs.access(
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
          "references",
          "ref-001.png",
        ),
      ),
    ).rejects.toThrow();
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
          "references",
          "manifest.json",
        ),
        "utf8",
      ),
    ).resolves.not.toContain('"ref-001.png"');
  });

  it("does not reuse a deleted reference image id or filename", async () => {
    const { storage, character, tempDir } = await createFixture(tempDirs);

    const firstReferenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    });
    await storage.deleteReferenceImage({
      character,
      referenceImageId: firstReferenceImages[0]!.id,
    });

    const nextReferenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-pose.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 4,
          contentBytes: new Uint8Array([4, 5, 6, 7]),
          createdAt: "2026-03-22T12:01:00.000Z",
        },
      ],
    });

    expect(nextReferenceImages).toEqual([
      {
        id: "ref_002",
        fileName: "ref-002.jpg",
        originalFileName: "rin-pose.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 4,
        createdAt: "2026-03-22T12:01:00.000Z",
      },
    ]);
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
          "references",
          "ref-002.jpg",
        ),
      ),
    ).resolves.toEqual(Buffer.from([4, 5, 6, 7]));
  });

  it("does not reuse a deleted reference image from legacy storage without a sequence cursor", async () => {
    const { storage, character, tempDir } = await createFixture(tempDirs);

    const firstReferenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    });
    await fs.rm(
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
        "references",
        "next-sequence.txt",
      ),
    );

    await storage.deleteReferenceImage({
      character,
      referenceImageId: firstReferenceImages[0]!.id,
    });
    const nextReferenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-pose.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 4,
          contentBytes: new Uint8Array([4, 5, 6, 7]),
          createdAt: "2026-03-22T12:01:00.000Z",
        },
      ],
    });

    expect(nextReferenceImages[0]).toEqual(
      expect.objectContaining({
        id: "ref_002",
        fileName: "ref-002.jpg",
      }),
    );
  });

  it("resolves absolute local file paths for current references", async () => {
    const { storage, character, tempDir } = await createFixture(tempDirs);

    await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    });

    await expect(storage.resolveReferenceImagePaths({ character })).resolves.toEqual([
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
        "references",
        "ref-001.png",
      ),
    ]);
  });

  it("returns content metadata for preview reads", async () => {
    const { storage, character, tempDir } = await createFixture(tempDirs);

    const referenceImages = await storage.saveReferenceImages({
      character,
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    });

    await expect(
      storage.getReferenceImageContent({
        character,
        referenceImageId: referenceImages[0]!.id,
      }),
    ).resolves.toEqual({
      filePath: path.join(
        tempDir,
        ".local-data",
        "projects",
        "proj_1-my-story",
        "character-sheets",
        "batches",
        "char_batch_v1",
        "characters",
        "char_rin_1",
        "references",
        "ref-001.png",
      ),
      fileName: "ref-001.png",
      mimeType: "image/png",
    });
  });
});

async function createFixture(tempDirs: string[]) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-character-reference-"));
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

  return { storage, character, tempDir };
}
