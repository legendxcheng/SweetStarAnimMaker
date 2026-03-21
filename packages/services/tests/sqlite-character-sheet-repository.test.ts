import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
  createProjectRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteCharacterSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite character sheet repository", () => {
  afterEach(async () => {
    for (const db of dbs) {
      db.close();
    }

    dbs.length = 0;
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("stores batches and character records", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    projectRepository.insert(
      createProjectRecord({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        createdAt: "2026-03-21T00:00:00.000Z",
        updatedAt: "2026-03-21T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      }),
    );
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

    repository.insertBatch(batch);
    repository.insertCharacter(character);

    expect(repository.findBatchById(batch.id)).toEqual(batch);
    expect(repository.findCharacterById(character.id)).toEqual(character);
    expect(repository.listCharactersByBatchId(batch.id)).toEqual([character]);
  });

  it("updates character status and image metadata", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    projectRepository.insert(
      createProjectRecord({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        createdAt: "2026-03-21T00:00:00.000Z",
        updatedAt: "2026-03-21T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      }),
    );
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

    repository.insertBatch(batch);
    repository.insertCharacter(character);
    repository.updateCharacter({
      ...character,
      status: "approved",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "mock-image-provider",
      model: "turnaround-v1",
      updatedAt: "2026-03-21T00:10:00.000Z",
      approvedAt: "2026-03-21T00:10:00.000Z",
    });

    expect(repository.findCharacterById(character.id)).toEqual(
      expect.objectContaining({
        status: "approved",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "mock-image-provider",
        model: "turnaround-v1",
      }),
    );
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-char-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    db,
    projectRepository: createSqliteProjectRepository({ db }),
    repository: createSqliteCharacterSheetRepository({ db }),
  };
}
