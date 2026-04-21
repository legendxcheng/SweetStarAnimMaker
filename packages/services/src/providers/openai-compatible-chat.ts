import {
  buildProviderNetworkError,
  buildProviderRequestError,
} from "./provider-request-error";

export interface RequestOpenAiCompatibleChatCompletionInput {
  baseUrl: string;
  apiToken: string;
  model: string;
  providerLabel: string;
  systemText: string;
  promptText: string;
  timeoutMs?: number;
  responseFormat?: "json_object";
}

export async function requestOpenAiCompatibleChatCompletion(
  input: RequestOpenAiCompatibleChatCompletionInput,
) {
  const controller = input.timeoutMs ? new AbortController() : null;
  const timeout =
    input.timeoutMs && controller ? setTimeout(() => controller.abort(), input.timeoutMs) : null;

  try {
    const requestBody: {
      model: string;
      messages: Array<{
        role: "system" | "user";
        content: string;
      }>;
      response_format?: {
        type: "json_object";
      };
    } = {
      model: input.model,
      messages: [
        {
          role: "system",
          content: input.systemText,
        },
        {
          role: "user",
          content: input.promptText,
        },
      ],
    };

    if (input.responseFormat === "json_object") {
      requestBody.response_format = {
        type: "json_object",
      };
    }

    const response = await fetch(`${input.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const bodyText = typeof response.text === "function" ? await response.text() : null;
      throw buildProviderRequestError(input.providerLabel, response.status, bodyText);
    }

    const rawResponse = await response.json();
    const text = extractAssistantContent(rawResponse);

    if (!text.trim()) {
      throw new Error(`${input.providerLabel} provider returned no usable content`);
    }

    return text.trim();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${input.providerLabel} provider request timed out`);
    }

    if (error instanceof Error && error.message === "fetch failed") {
      throw buildProviderNetworkError(input.providerLabel, error);
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function extractAssistantContent(rawResponse: unknown) {
  const choice = (rawResponse as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  })?.choices?.[0];

  if (!choice?.message) {
    return "";
  }

  const content = choice.message.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const partType = (item as { type?: unknown }).type;
        const partText = (item as { text?: unknown }).text;

        return partType === "text" && typeof partText === "string" ? [partText] : [];
      })
      .join("");

    if (text) {
      return text;
    }
  }

  return "";
}
