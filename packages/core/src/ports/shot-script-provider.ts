import type { CurrentShotScript } from "@sweet-star/shared";

export interface GenerateShotScriptInput {
  promptText: string;
  variables: Record<string, unknown>;
}

export interface GenerateShotScriptResult {
  rawResponse: string;
  shotScript: CurrentShotScript;
}

export interface ShotScriptProvider {
  generateShotScript(
    input: GenerateShotScriptInput,
  ): Promise<GenerateShotScriptResult> | GenerateShotScriptResult;
}
