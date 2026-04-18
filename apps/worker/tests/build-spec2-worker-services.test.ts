import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSeedanceStageVideoProvider,
} from "@sweet-star/services";

import { createConfiguredVideoProvider } from "../src/bootstrap/video-provider-config";

vi.mock("@sweet-star/services", async () => {
  const actual = await vi.importActual<typeof import("@sweet-star/services")>("@sweet-star/services");

  return {
    ...actual,
    createSeedanceStageVideoProvider: vi.fn(() => ({
      generateSegmentVideo: vi.fn(),
    })),
  };
});

describe("createConfiguredVideoProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the seedance provider and logs unset optional config by default", () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const referenceImageUploader = {
      uploadReferenceImage: vi.fn(),
    };

    createConfiguredVideoProvider({
      env: {
        SEEDANCE_API_BASE_URL: "https://ark.cn-beijing.volces.com",
      },
      referenceImageUploader,
    });

    expect(createSeedanceStageVideoProvider).toHaveBeenCalledWith({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: undefined,
      modelName: undefined,
      durationSeconds: undefined,
      ratio: undefined,
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[video-provider-config] selected",
      expect.objectContaining({
        providerName: "seedance",
        modelName: undefined,
        durationSeconds: undefined,
        ratio: undefined,
        baseUrlConfigured: true,
        apiKeyConfigured: false,
      }),
    );
  });

  it("passes explicit seedance env values through to the provider", () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const referenceImageUploader = {
      uploadReferenceImage: vi.fn(),
    };

    createConfiguredVideoProvider({
      env: {
        SEEDANCE_API_BASE_URL: "https://ark.cn-beijing.volces.com",
        SEEDANCE_API_KEY: "seedance-token",
        SEEDANCE_MODEL: "doubao-seedance-2-0-260128",
        SEEDANCE_DURATION_SEC: "8",
        SEEDANCE_ASPECT_RATIO: "16:9",
      },
      referenceImageUploader,
    });

    expect(createSeedanceStageVideoProvider).toHaveBeenCalledWith({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "seedance-token",
      modelName: "doubao-seedance-2-0-260128",
      durationSeconds: 8,
      ratio: "16:9",
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[video-provider-config] selected",
      expect.objectContaining({
        providerName: "seedance",
        modelName: "doubao-seedance-2-0-260128",
        durationSeconds: 8,
        ratio: "16:9",
        baseUrlConfigured: true,
        apiKeyConfigured: true,
      }),
    );
  });
});
