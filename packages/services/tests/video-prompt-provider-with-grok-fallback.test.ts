import { describe, expect, it, vi } from "vitest";

import { createVideoPromptProviderWithGrokFallback } from "../src/index";

describe("video prompt provider with grok fallback", () => {
  it("retries with Grok when Gemini is blocked for prohibited content", async () => {
    const provider = createVideoPromptProviderWithGrokFallback(
      {
        generateVideoPrompt: vi.fn().mockRejectedValue(
          new Error(
            "Gemini video prompt provider request failed with status 500; code=request_body_blocked; message=request blocked by Google Gemini (PROHIBITED_CONTENT)",
          ),
        ),
      },
      {
        generateVideoPrompt: vi.fn().mockResolvedValue({
          finalPrompt: "fallback prompt",
          dialoguePlan: "无人物对白，无旁白，无语音，不需要口型。",
          audioPlan: "环境声/音效/音乐：雨声。必须输出可听音轨，不允许静音或无声成片。",
          visualGuardrails: "保持角色稳定。",
          rationale: "fallback",
          rawResponse: "{\"finalPrompt\":\"fallback prompt\"}",
          provider: "grok",
          model: "grok-4.2",
        }),
      },
    );

    const result = await provider.generateVideoPrompt({
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "summary",
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "purpose",
        visual: "visual",
        subject: "subject",
        action: "action",
        frameDependency: "start_frame_only",
        dialogue: null,
        os: null,
        audio: null,
        transitionHint: null,
        continuityNotes: null,
      },
      durationSec: 3,
      startFrame: {
        imageAssetPath: "images/start.png",
        width: 1024,
        height: 576,
      },
      endFrame: null,
    });

    expect(result.provider).toBe("grok");
  });

  it("retries with Grok when Gemini returns an invalid prompt plan JSON payload", async () => {
    const primaryGenerate = vi
      .fn()
      .mockRejectedValue(new Error("Gemini video prompt provider returned invalid prompt plan JSON"));
    const fallbackGenerate = vi.fn().mockResolvedValue({
      finalPrompt: "fallback prompt",
      dialoguePlan: "无人物对白，无旁白，无语音，不需要口型。",
      audioPlan: "环境声/音效：雨声。必须输出可听音轨，不允许静音或无声成片。",
      visualGuardrails: "保持角色稳定。",
      rationale: "fallback",
      rawResponse: "{\"finalPrompt\":\"fallback prompt\"}",
      provider: "grok",
      model: "grok-4.2",
    });
    const provider = createVideoPromptProviderWithGrokFallback(
      {
        generateVideoPrompt: primaryGenerate,
      },
      {
        generateVideoPrompt: fallbackGenerate,
      },
    );

    const input = {
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "summary",
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "purpose",
        visual: "visual",
        subject: "subject",
        action: "action",
        frameDependency: "start_frame_only" as const,
        dialogue: null,
        os: null,
        audio: null,
        transitionHint: null,
        continuityNotes: null,
      },
      durationSec: 3,
      startFrame: {
        imageAssetPath: "images/start.png",
        width: 1024,
        height: 576,
      },
      endFrame: null,
    };

    const result = await provider.generateVideoPrompt(input);

    expect(result.provider).toBe("grok");
    expect(primaryGenerate).toHaveBeenCalledTimes(1);
    expect(fallbackGenerate).toHaveBeenCalledTimes(1);
    expect(fallbackGenerate).toHaveBeenCalledWith(input);
  });

  it("does not retry with Grok for unrelated provider failures", async () => {
    const provider = createVideoPromptProviderWithGrokFallback(
      {
        generateVideoPrompt: vi
          .fn()
          .mockRejectedValue(new Error("Gemini video prompt provider request timed out")),
      },
      {
        generateVideoPrompt: vi.fn(),
      },
    );

    await expect(
      provider.generateVideoPrompt({
        projectId: "proj_1",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          summary: "summary",
        },
        currentShot: {
          id: "shot_1",
          shotCode: "SC01-SG01-SH01",
          purpose: "purpose",
          visual: "visual",
          subject: "subject",
          action: "action",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: null,
          audio: null,
          transitionHint: null,
          continuityNotes: null,
        },
        durationSec: 3,
        startFrame: {
          imageAssetPath: "images/start.png",
          width: 1024,
          height: 576,
        },
        endFrame: null,
      }),
    ).rejects.toThrow("Gemini video prompt provider request timed out");
  });
});
