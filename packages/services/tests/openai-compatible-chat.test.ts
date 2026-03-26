import { afterEach, describe, expect, it, vi } from "vitest";

import { requestOpenAiCompatibleChatCompletion } from "../src/providers/openai-compatible-chat";

describe("openai-compatible chat helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the chat completions endpoint and returns assistant content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "{\"ok\":true}",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestOpenAiCompatibleChatCompletion({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
      providerLabel: "Grok storyboard",
      systemText: "Return only JSON.",
      promptText: "Generate a tiny object.",
      responseFormat: "json_object",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.model).toBe("grok-4.2");
    expect(request.messages[0]).toEqual({
      role: "system",
      content: "Return only JSON.",
    });
    expect(request.messages[1]).toEqual({
      role: "user",
      content: "Generate a tiny object.",
    });
    expect(request.response_format).toEqual({
      type: "json_object",
    });
    expect(result).toBe("{\"ok\":true}");
  });

  it("omits response_format for plain text requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "hello",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestOpenAiCompatibleChatCompletion({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
      providerLabel: "Grok text",
      systemText: "Be brief.",
      promptText: "Say hello.",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.response_format).toBeUndefined();
  });

  it("rejects non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(
      requestOpenAiCompatibleChatCompletion({
        baseUrl: "https://api.vectorengine.ai",
        apiToken: "test-token",
        model: "grok-4.2",
        providerLabel: "Grok storyboard",
        systemText: "Return only JSON.",
        promptText: "Generate a tiny object.",
      }),
    ).rejects.toThrow("Grok storyboard provider request failed with status 503");
  });

  it("includes provider error details from non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: {
              code: "policy_violation",
              message: "request blocked by upstream policy",
            },
          }),
      }),
    );

    await expect(
      requestOpenAiCompatibleChatCompletion({
        baseUrl: "https://api.vectorengine.ai",
        apiToken: "test-token",
        model: "grok-4.2",
        providerLabel: "Grok storyboard",
        systemText: "Return only JSON.",
        promptText: "Generate a tiny object.",
      }),
    ).rejects.toThrow(
      "Grok storyboard provider request failed with status 400; code=policy_violation; message=request blocked by upstream policy",
    );
  });

  it("rejects responses without usable content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      }),
    );

    await expect(
      requestOpenAiCompatibleChatCompletion({
        baseUrl: "https://api.vectorengine.ai",
        apiToken: "test-token",
        model: "grok-4.2",
        providerLabel: "Grok storyboard",
        systemText: "Return only JSON.",
        promptText: "Generate a tiny object.",
      }),
    ).rejects.toThrow("Grok storyboard provider returned no usable content");
  });
});
