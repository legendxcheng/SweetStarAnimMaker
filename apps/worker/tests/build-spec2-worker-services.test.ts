import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createKlingStageVideoProvider,
  createSoraStageVideoProvider,
} from "@sweet-star/services";

import { createConfiguredVideoProvider } from "../src/bootstrap/video-provider-config";

vi.mock("@sweet-star/services", async () => {
  const actual = await vi.importActual<typeof import("@sweet-star/services")>("@sweet-star/services");

  return {
    ...actual,
    createKlingStageVideoProvider: vi.fn(() => ({
      generateSegmentVideo: vi.fn(),
    })),
    createSoraStageVideoProvider: vi.fn(() => ({
      generateSegmentVideo: vi.fn(),
    })),
  };
});

describe("createConfiguredVideoProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to Kling with production Kling defaults", () => {
    const referenceImageUploader = {
      uploadReferenceImage: vi.fn(),
    };

    createConfiguredVideoProvider({
      env: {
        VECTORENGINE_BASE_URL: "https://api.vectorengine.ai",
        VECTORENGINE_API_TOKEN: "test-token",
      },
      referenceImageUploader,
    });

    expect(createKlingStageVideoProvider).toHaveBeenCalledWith({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      modelName: undefined,
      mode: "std",
      sound: "on",
      multiShot: true,
      durationSeconds: 10,
      referenceImageUploader,
    });
    expect(createSoraStageVideoProvider).not.toHaveBeenCalled();
  });

  it("selects Sora when VIDEO_PROVIDER is set to sora", () => {
    const referenceImageUploader = {
      uploadReferenceImage: vi.fn(),
    };

    createConfiguredVideoProvider({
      env: {
        VIDEO_PROVIDER: "sora",
        VECTORENGINE_BASE_URL: "https://api.vectorengine.ai",
        VECTORENGINE_API_TOKEN: "test-token",
        VIDEO_MODEL: "sora-custom",
      },
      referenceImageUploader,
    });

    expect(createSoraStageVideoProvider).toHaveBeenCalledWith({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      modelName: "sora-custom",
      referenceImageUploader,
    });
    expect(createKlingStageVideoProvider).not.toHaveBeenCalled();
  });

  it("rejects unsupported provider names", () => {
    expect(() =>
      createConfiguredVideoProvider({
        env: {
          VIDEO_PROVIDER: "invalid-provider",
        },
        referenceImageUploader: {
          uploadReferenceImage: vi.fn(),
        },
      }),
    ).toThrow("Unsupported VIDEO_PROVIDER: invalid-provider");
  });
});
