import { describe, expect, it } from "vitest";

import {
  createCharacterSheetBatchRecord,
  createCharacterSheetRecord,
  toCurrentCharacterSheetBatchSummary,
} from "../src/index";

describe("character sheet domain", () => {
  it("builds batch and character storage paths", () => {
    const batch = createCharacterSheetBatchRecord({
      id: "char_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceMasterPlotId: "master_plot_v1",
      characterCount: 2,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:00:00.000Z",
    });
    const record = createCharacterSheetRecord({
      id: "char_rin",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      batchId: batch.id,
      sourceMasterPlotId: "master_plot_v1",
      characterName: "Rin",
      promptTextGenerated: "silver pilot jacket",
      promptTextCurrent: "silver pilot jacket",
      updatedAt: "2026-03-21T12:05:00.000Z",
    });

    expect(batch.storageDir).toBe("projects/proj_1-my-story/character-sheets/batches/char_batch_v1");
    expect(batch.manifestRelPath).toBe("character-sheets/batches/char_batch_v1/manifest.json");
    expect(record.storageDir).toBe(
      "projects/proj_1-my-story/character-sheets/batches/char_batch_v1/characters/char_rin",
    );
    expect(record.currentImageRelPath).toBe(
      "character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
    );
    expect(record.promptCurrentRelPath).toBe(
      "character-sheets/batches/char_batch_v1/characters/char_rin/prompt.current.txt",
    );
  });

  it("builds a batch summary with approved character counts", () => {
    const batch = createCharacterSheetBatchRecord({
      id: "char_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceMasterPlotId: "master_plot_v1",
      characterCount: 3,
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:10:00.000Z",
    });
    const characters = [
      createCharacterSheetRecord({
        id: "char_rin",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: batch.id,
        sourceMasterPlotId: "master_plot_v1",
        characterName: "Rin",
        promptTextGenerated: "silver pilot jacket",
        promptTextCurrent: "silver pilot jacket",
        status: "approved",
        approvedAt: "2026-03-21T12:08:00.000Z",
        updatedAt: "2026-03-21T12:08:00.000Z",
      }),
      createCharacterSheetRecord({
        id: "char_ivo",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: batch.id,
        sourceMasterPlotId: "master_plot_v1",
        characterName: "Ivo",
        promptTextGenerated: "engine grease, brass goggles",
        promptTextCurrent: "engine grease, brass goggles",
        status: "in_review",
        updatedAt: "2026-03-21T12:09:00.000Z",
      }),
      createCharacterSheetRecord({
        id: "char_warden",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: batch.id,
        sourceMasterPlotId: "master_plot_v1",
        characterName: "Warden",
        promptTextGenerated: "obsidian coat, scarred cheek",
        promptTextCurrent: "obsidian coat, scarred cheek",
        status: "approved",
        approvedAt: "2026-03-21T12:10:00.000Z",
        updatedAt: "2026-03-21T12:10:00.000Z",
      }),
    ];

    const summary = toCurrentCharacterSheetBatchSummary(batch, characters);

    expect(summary).toEqual({
      id: "char_batch_v1",
      sourceMasterPlotId: "master_plot_v1",
      characterCount: 3,
      approvedCharacterCount: 2,
      updatedAt: "2026-03-21T12:10:00.000Z",
    });
  });
});
