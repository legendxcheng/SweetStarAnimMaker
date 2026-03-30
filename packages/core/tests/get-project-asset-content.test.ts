import fs from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createGetProjectAssetContentUseCase } from "../src/index";

describe("get project asset content use case", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns video/mp4 for mp4 project assets", async () => {
    vi.spyOn(fs, "access").mockResolvedValue(undefined);

    const useCase = createGetProjectAssetContentUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          storageDir: "projects/proj_1-my-story",
        }),
        listAll: vi.fn(),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
      },
      shotImageStorage: {
        writeBatchManifest: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentFrame: vi.fn(),
        writeImageVersion: vi.fn(),
        writeFramePromptFiles: vi.fn(),
        writeFramePlanning: vi.fn(),
        writeFramePromptVersion: vi.fn(),
        resolveProjectAssetPath: vi
          .fn()
          .mockResolvedValue(
            "E:\\SweetStarAnimMaker\\.local-data\\projects\\proj_1-my-story\\videos\\batches\\video_batch_1\\shots\\shot_1\\current.mp4",
          ),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      assetRelPath: "videos/batches/video_batch_1/shots/shot_1/current.mp4",
    });

    expect(result.mimeType).toBe("video/mp4");
  });
});
