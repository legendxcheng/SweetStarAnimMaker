import { describe, expect, it, vi } from "vitest";

import { createCreateProjectUseCase } from "../src/index";

describe("create project use case", () => {
  it("creates a project and returns the expected detail dto", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      updateScriptMetadata: vi.fn(),
    };
    const scriptStorage = {
      writeOriginalScript: vi.fn().mockReturnValue({
        scriptRelPath: "script/original.txt",
        scriptBytes: 7,
      }),
      readOriginalScript: vi.fn(),
      deleteOriginalScript: vi.fn(),
    };
    const useCase = createCreateProjectUseCase({
      repository,
      scriptStorage,
      idGenerator: {
        generateProjectId: () => "proj_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T00:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      name: "My Story",
      script: "Scene 1",
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "proj_20260317_ab12cd",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        scriptBytes: 7,
      }),
    );
    expect(result).toEqual({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "script_ready",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      script: {
        path: "script/original.txt",
        bytes: 7,
        updatedAt: "2026-03-17T00:00:00.000Z",
      },
    });
  });

  it("removes the script file when repository insert fails", async () => {
    const repository = {
      insert: vi.fn(() => {
        throw new Error("insert failed");
      }),
      findById: vi.fn(),
      updateScriptMetadata: vi.fn(),
    };
    const scriptStorage = {
      writeOriginalScript: vi.fn().mockReturnValue({
        scriptRelPath: "script/original.txt",
        scriptBytes: 7,
      }),
      readOriginalScript: vi.fn(),
      deleteOriginalScript: vi.fn(),
    };
    const useCase = createCreateProjectUseCase({
      repository,
      scriptStorage,
      idGenerator: {
        generateProjectId: () => "proj_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T00:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        name: "My Story",
        script: "Scene 1",
      }),
    ).rejects.toThrow("insert failed");

    expect(scriptStorage.deleteOriginalScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260317_ab12cd-my-story",
    });
  });
});
