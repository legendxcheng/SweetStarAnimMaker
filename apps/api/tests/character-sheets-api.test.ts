import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
} from "@sweet-star/core";
import {
  createCharacterSheetStorage,
  createLocalDataPaths,
  createSqliteCharacterSheetRepository,
  createSqliteDb,
  createSqliteProjectRepository,
  createStoryboardStorage,
} from "@sweet-star/services";
import type { CurrentMasterPlot } from "@sweet-star/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app";
import { ensureTestPromptTemplate } from "./prompt-template-test-helper";

describe("character sheets api", () => {
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

  it("lists current character sheets for a project", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_ivo_2",
          characterName: "Ivo",
          status: "approved",
        },
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/character-sheets`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        currentBatch: expect.objectContaining({
          id: "char_batch_v1",
          characterCount: 2,
          approvedCharacterCount: 1,
        }),
        characters: [
          expect.objectContaining({ id: "char_ivo_2", status: "approved" }),
          expect.objectContaining({ id: "char_rin_1", status: "in_review" }),
        ],
      }),
    );
  });

  it("gets one character sheet by id", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/character-sheets/char_rin_1`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "char_rin_1",
        characterName: "Rin",
      }),
    );
  });

  it("updates a character prompt", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const response = await app.inject({
      method: "PUT",
      url: `/projects/${project.id}/character-sheets/char_rin_1/prompt`,
      payload: {
        promptTextCurrent: "Silver pilot jacket, storm glare, left-brow scar.",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "char_rin_1",
        promptTextCurrent: "Silver pilot jacket, storm glare, left-brow scar.",
      }),
    );
  });

  it("uploads character reference images and returns updated detail", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const payload = createMultipartPayload([
      {
        fieldName: "files",
        fileName: "rin-face.png",
        contentType: "image/png",
        bytes: Buffer.from([1, 2, 3]),
      },
    ]);
    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/character-sheets/char_rin_1/reference-images`,
      headers: {
        "content-type": payload.contentType,
      },
      payload: payload.body,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "char_rin_1",
        referenceImages: [
          expect.objectContaining({
            originalFileName: "rin-face.png",
            mimeType: "image/png",
          }),
        ],
      }),
    );
  });

  it("deletes a character reference image and returns updated detail", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });
    const referenceImages = await seedCharacterReferenceImages({
      tempDir,
      projectStorageDir: project.storageDir,
      batchId: "char_batch_v1",
      characterId: "char_rin_1",
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/projects/${project.id}/character-sheets/char_rin_1/reference-images/${referenceImages[0]!.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "char_rin_1",
        referenceImages: [],
      }),
    );
  });

  it("streams character reference image content", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });
    const referenceImages = await seedCharacterReferenceImages({
      tempDir,
      projectStorageDir: project.storageDir,
      batchId: "char_batch_v1",
      characterId: "char_rin_1",
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/character-sheets/char_rin_1/reference-images/${referenceImages[0]!.id}/content`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("rejects non-image uploads", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const payload = createMultipartPayload([
      {
        fieldName: "files",
        fileName: "notes.txt",
        contentType: "text/plain",
        bytes: Buffer.from("not an image", "utf8"),
      },
    ]);
    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/character-sheets/char_rin_1/reference-images`,
      headers: {
        "content-type": payload.contentType,
      },
      payload: payload.body,
    });

    expect(response.statusCode).toBe(400);
  });

  it("regenerates a character sheet and enqueues an image task", async () => {
    const enqueue = vi.fn();
    const { app, tempDir } = await createTempApp({
      taskQueue: { enqueue },
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_char_regen",
      },
    });
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/character-sheets/char_rin_1/regenerate`,
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: "task_20260321_char_regen",
        type: "character_sheet_generate",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith({
      taskId: "task_20260321_char_regen",
      queueName: "character-sheet-generate",
      taskType: "character_sheet_generate",
    });
  });

  it("approves the final character and moves the project to character_sheets_approved", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const approveResponse = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/character-sheets/char_rin_1/approve`,
      payload: {},
    });

    expect(approveResponse.statusCode).toBe(200);
    expect(approveResponse.json()).toEqual(
      expect.objectContaining({
        id: "char_rin_1",
        status: "approved",
        approvedAt: expect.any(String),
      }),
    );

    const projectDetailResponse = await app.inject({
      method: "GET",
      url: `/projects/${project.id}`,
    });
    expect(projectDetailResponse.statusCode).toBe(200);
    expect(projectDetailResponse.json().status).toBe("character_sheets_approved");
  });

  it("returns 404 for a missing character", async () => {
    const { app, tempDir } = await createTempApp();
    const project = await createProject(app);

    await seedCharacterSheets({
      tempDir,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      status: "character_sheets_in_review",
      characters: [
        {
          id: "char_rin_1",
          characterName: "Rin",
          status: "in_review",
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: `/projects/${project.id}/character-sheets/missing-character`,
    });

    expect(response.statusCode).toBe(404);
  });

  async function createTempApp(options?: {
    taskQueue?: { enqueue: ReturnType<typeof vi.fn> };
    taskIdGenerator?: { generateTaskId(): string };
  }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-character-sheets-api-"));
    tempDirs.push(tempDir);
    await ensureTestPromptTemplate(tempDir);

    const app = buildApp({
      dataRoot: tempDir,
      taskQueue: options?.taskQueue,
      taskIdGenerator: options?.taskIdGenerator,
    });
    apps.push(app);
    await app.ready();

    return { app, tempDir };
  }

  async function createProject(app: FastifyInstance) {
    const created = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {
        name: "My Story",
        premiseText,
      },
    });

    return created.json();
  }
});

async function seedCharacterSheets(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
  status:
    | "character_sheets_generating"
    | "character_sheets_in_review"
    | "character_sheets_approved";
  characters: Array<{
    id: string;
    characterName: string;
    status: "generating" | "in_review" | "approved" | "failed";
  }>;
}) {
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const characterSheetRepository = createSqliteCharacterSheetRepository({ db });

  const batch = createCharacterSheetBatchRecord({
    id: "char_batch_v1",
    projectId: input.projectId,
    projectStorageDir: input.projectStorageDir,
    sourceMasterPlotId: "mp_20260321_ab12cd",
    characterCount: input.characters.length,
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T12:00:00.000Z",
  });

  characterSheetRepository.insertBatch(batch);
  for (const entry of input.characters) {
    const character = createCharacterSheetRecord({
      id: entry.id,
      projectId: input.projectId,
      projectStorageDir: input.projectStorageDir,
      batchId: batch.id,
      sourceMasterPlotId: "mp_20260321_ab12cd",
      characterName: entry.characterName,
      promptTextGenerated: `${entry.characterName} generated prompt`,
      promptTextCurrent: `${entry.characterName} current prompt`,
      updatedAt: "2026-03-21T12:00:00.000Z",
    });
    characterSheetRepository.insertCharacter({
      ...character,
      status: entry.status,
      approvedAt: entry.status === "approved" ? "2026-03-21T12:05:00.000Z" : null,
    });
  }

  projectRepository.updateCurrentCharacterSheetBatch({
    projectId: input.projectId,
    batchId: batch.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: input.status,
    updatedAt: "2026-03-21T12:06:00.000Z",
  });
  db.close();
}

async function seedCharacterReferenceImages(input: {
  tempDir: string;
  projectStorageDir: string;
  batchId: string;
  characterId: string;
}) {
  const storage = createCharacterSheetStorage({
    paths: createLocalDataPaths(input.tempDir),
  });
  const character = createCharacterSheetRecord({
    id: input.characterId,
    projectId: "proj_1",
    projectStorageDir: input.projectStorageDir,
    batchId: input.batchId,
    sourceMasterPlotId: "mp_20260321_ab12cd",
    characterName: "Rin",
    promptTextGenerated: "Rin generated prompt",
    promptTextCurrent: "Rin current prompt",
    updatedAt: "2026-03-21T12:00:00.000Z",
  });

  return storage.saveReferenceImages({
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
}

function createMultipartPayload(
  files: Array<{
    fieldName: string;
    fileName: string;
    contentType: string;
    bytes: Buffer;
  }>,
) {
  const boundary = "----sweet-star-boundary";
  const chunks: Buffer[] = [];

  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
        "utf8",
      ),
    );
    chunks.push(file.bytes);
    chunks.push(Buffer.from("\r\n", "utf8"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export async function seedApprovedMasterPlot(input: {
  tempDir: string;
  projectId: string;
  projectStorageDir: string;
}) {
  const masterPlot: CurrentMasterPlot = {
    id: "mp_20260321_ab12cd",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis:
      "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict:
      "Rin must choose between private escape and saving the city that exiled her.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "Rin turns the comet's music into a rising tide of light.",
    targetDurationSec: 480,
    sourceTaskId: "task_20260321_master_plot",
    updatedAt: "2026-03-21T12:00:00.000Z",
    approvedAt: "2026-03-21T12:05:00.000Z",
  };
  const paths = createLocalDataPaths(input.tempDir);
  const db = createSqliteDb({ paths });
  const projectRepository = createSqliteProjectRepository({ db });
  const storyboardStorage = createStoryboardStorage({ paths });

  await storyboardStorage.writeCurrentMasterPlot({
    storageDir: input.projectStorageDir,
    masterPlot,
  });
  projectRepository.updateCurrentMasterPlot({
    projectId: input.projectId,
    masterPlotId: masterPlot.id,
  });
  projectRepository.updateStatus({
    projectId: input.projectId,
    status: "master_plot_approved",
    updatedAt: masterPlot.approvedAt ?? masterPlot.updatedAt,
  });
  db.close();
}
