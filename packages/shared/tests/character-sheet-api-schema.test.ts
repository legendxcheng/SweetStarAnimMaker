import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("character sheet api schema", () => {
  it("accepts a character-sheet batch list response", () => {
    const parsed = shared.characterSheetListResponseSchema.parse({
      currentBatch: {
        id: "char_batch_v1",
        sourceMasterPlotId: "master_plot_v1",
        characterCount: 2,
        approvedCharacterCount: 1,
        updatedAt: "2026-03-21T12:20:00.000Z",
      },
      characters: [
        {
          id: "char_rin",
          projectId: "proj_1",
          batchId: "char_batch_v1",
          sourceMasterPlotId: "master_plot_v1",
          characterName: "Rin",
          promptTextGenerated: "silver pilot jacket, wind-burned face",
          promptTextCurrent: "silver pilot jacket, wind-burned face",
          referenceImages: [
            {
              id: "ref_1",
              fileName: "ref-001.png",
              originalFileName: "rin-face.png",
              mimeType: "image/png",
              sizeBytes: 1234,
              createdAt: "2026-03-22T12:00:00.000Z",
            },
          ],
          imageAssetPath: "character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "mock-image-provider",
          model: "turnaround-v1",
          status: "in_review",
          updatedAt: "2026-03-21T12:25:00.000Z",
          approvedAt: null,
          sourceTaskId: "task_char_rin",
        },
      ],
    });

    expect(parsed.currentBatch.characterCount).toBe(2);
    expect(parsed.characters[0]?.characterName).toBe("Rin");
    expect(parsed.characters[0]?.referenceImages).toEqual([
      {
        id: "ref_1",
        fileName: "ref-001.png",
        originalFileName: "rin-face.png",
        mimeType: "image/png",
        sizeBytes: 1234,
        createdAt: "2026-03-22T12:00:00.000Z",
      },
    ]);
  });

  it("accepts a character-sheet detail response", () => {
    const parsed = shared.characterSheetDetailResponseSchema.parse({
      id: "char_rin",
      projectId: "proj_1",
      batchId: "char_batch_v1",
      sourceMasterPlotId: "master_plot_v1",
      characterName: "Rin",
      promptTextGenerated: "silver pilot jacket, wind-burned face",
      promptTextCurrent: "silver pilot jacket, wind-burned face",
      referenceImages: [
        {
          id: "ref_1",
          fileName: "ref-001.png",
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 1234,
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
      imageAssetPath: "character-sheets/batches/char_batch_v1/characters/char_rin/current.png",
      imageWidth: 1536,
      imageHeight: 1024,
      provider: "mock-image-provider",
      model: "turnaround-v1",
      status: "approved",
      updatedAt: "2026-03-21T12:30:00.000Z",
      approvedAt: "2026-03-21T12:31:00.000Z",
      sourceTaskId: "task_char_rin",
    });

    expect(parsed.status).toBe("approved");
    expect(parsed.referenceImages[0]?.fileName).toBe("ref-001.png");
  });

  it("accepts a prompt update request", () => {
    const parsed = shared.updateCharacterSheetPromptRequestSchema.parse({
      promptTextCurrent: "short black hair, aviator jacket, guarded expression",
    });

    expect(parsed.promptTextCurrent).toContain("aviator jacket");
  });

  it("accepts regenerate and approve requests", () => {
    expect(shared.regenerateCharacterSheetRequestSchema.parse({})).toEqual({});
    expect(shared.approveCharacterSheetRequestSchema.parse({})).toEqual({});
  });
});
