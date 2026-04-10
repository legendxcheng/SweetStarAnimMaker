import type {
  GenerateShotScriptSegmentInput,
  GenerateShotScriptSegmentResult,
  ShotScriptCanonicalCharacterContext,
  ShotScriptProvider,
} from "@sweet-star/core";
import { buildShotScriptCanonicalCharacterValidator } from "@sweet-star/core";

import { requestGeminiShotScriptJson } from "./gemini-shot-script-client";
import {
  downgradeUnsafeGeminiFrameDependencies,
  findUnsafeGeminiFrameDependencyIssues,
  normalizeGeminiShotScriptSegmentPayload,
  parseGeminiShotScriptPayload,
} from "./gemini-shot-script-payload";

export interface CreateGeminiShotScriptProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";

type GeminiShotScriptProviderError = Error & {
  rawResponse?: string;
};

export function createGeminiShotScriptProvider(
  options: CreateGeminiShotScriptProviderOptions,
): ShotScriptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiToken = options.apiToken?.trim();
  const model = options.model?.trim() || DEFAULT_MODEL;

  if (!apiToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for shot script generation");
  }

  return {
    async generateShotScriptSegment(
      input: GenerateShotScriptSegmentInput,
    ): Promise<GenerateShotScriptSegmentResult> {
      const characterSheets = readCanonicalCharacterContext(input.variables);
      const validator = buildShotScriptCanonicalCharacterValidator(characterSheets);
      const maxAttempts = characterSheets.length > 0 ? 3 : 2;
      let promptText = input.promptText;
      let lastViolationsMessage = "";

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const rawText = await requestGeminiShotScriptJson({
          baseUrl,
          apiToken,
          model,
          timeoutMs: options.timeoutMs,
          promptText,
        });

        try {
          const normalizedPayload = normalizeGeminiShotScriptSegmentPayload(
            parseGeminiShotScriptPayload(rawText),
            input.variables,
          );
          const violations = validator.validateShots(normalizedPayload.segment.shots);
          const unsafeIssues = findUnsafeGeminiFrameDependencyIssues(normalizedPayload);

          if (violations.length === 0 && unsafeIssues.length === 0) {
            return {
              rawResponse: rawText,
              segment: normalizedPayload.segment,
            };
          }

          lastViolationsMessage = violations.map((violation) => violation.message).join("\n");
          const unsafeIssuesMessage = unsafeIssues.join("\n");

          if (attempt === maxAttempts) {
            if (violations.length === 0 && unsafeIssues.length > 0) {
              return {
                rawResponse: rawText,
                segment: downgradeUnsafeGeminiFrameDependencies(normalizedPayload.segment),
              };
            }

            throw new Error(
              `Gemini shot script provider failed canonical character validation after ${attempt} attempts: ${lastViolationsMessage}`,
            );
          }

          promptText = buildCorrectionPrompt(
            input.promptText,
            lastViolationsMessage,
            unsafeIssuesMessage,
          );
        } catch (error) {
          throw attachRawResponse(error, rawText);
        }
      }

      throw new Error(
        `Gemini shot script provider failed canonical character validation after ${maxAttempts} attempts: ${lastViolationsMessage}`,
      );
    },
  };
}

function attachRawResponse(error: unknown, rawResponse: string): GeminiShotScriptProviderError {
  if (error instanceof Error) {
    const providerError = error as GeminiShotScriptProviderError;
    providerError.rawResponse = rawResponse;
    return providerError;
  }

  return Object.assign(new Error("Gemini shot script provider failed"), {
    cause: error,
    rawResponse,
  });
}

function readCanonicalCharacterContext(
  variables: Record<string, unknown>,
): ShotScriptCanonicalCharacterContext[] {
  const characterSheets = variables.characterSheets;

  if (!Array.isArray(characterSheets)) {
    return [];
  }

  return characterSheets.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const characterName = (entry as { characterName?: unknown }).characterName;
    const promptTextCurrent = (entry as { promptTextCurrent?: unknown }).promptTextCurrent;
    const characterId = (entry as { characterId?: unknown }).characterId;
    const imageAssetPath = (entry as { imageAssetPath?: unknown }).imageAssetPath;

    if (
      typeof characterId !== "string" ||
      !characterId.trim() ||
      typeof characterName !== "string" ||
      !characterName.trim() ||
      typeof promptTextCurrent !== "string" ||
      !promptTextCurrent.trim()
    ) {
      return [];
    }

    return [
      {
        characterId,
        characterName,
        promptTextCurrent,
        imageAssetPath: typeof imageAssetPath === "string" ? imageAssetPath : null,
      },
    ];
  });
}

function buildCorrectionPrompt(
  basePromptText: string,
  violationsMessage: string,
  unsafeIssuesMessage: string,
) {
  const sections = [basePromptText];

  if (violationsMessage.trim().length > 0) {
    sections.push(
      "",
      "上一次输出存在以下角色命名问题，请只修正这些问题后重新输出完整 JSON：",
      violationsMessage,
      "所有涉及已批准角色的镜头，必须保留标准角色名，不得使用简称或泛称。",
    );
  }

  if (unsafeIssuesMessage.trim().length > 0) {
    sections.push(
      "",
      "上一次输出存在以下关键节点规划问题，请修正后重新输出完整 JSON：",
      unsafeIssuesMessage,
      "对于不可平滑过渡的关键节点，不要强行使用 start_and_end_frame。",
      "请优先拆出更多关键节点或更多 shots；如果仍然拿不准，就改用 start_frame_only。",
    );
  }

  return sections.join("\n");
}
