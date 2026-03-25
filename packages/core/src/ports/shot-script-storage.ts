import type { CurrentShotScript } from "@sweet-star/shared";

export interface InitializeShotScriptPromptTemplateInput {
  storageDir: string;
  promptTemplateKey: "shot_script.generate" | "shot_script.segment.generate";
}

export interface ReadShotScriptPromptTemplateInput {
  storageDir: string;
  promptTemplateKey: "shot_script.generate" | "shot_script.segment.generate";
}

export interface WriteCurrentShotScriptInput {
  storageDir: string;
  shotScript: CurrentShotScript;
}

export interface ReadCurrentShotScriptInput {
  storageDir: string;
}

export interface WriteShotScriptVersionInput {
  storageDir: string;
  versionId: string;
  kind: "ai" | "human";
  shotScript: CurrentShotScript;
}

export interface ReadShotScriptVersionInput {
  storageDir: string;
  versionId: string;
}

export interface WriteShotScriptPromptSnapshotInput {
  taskStorageDir: string;
  promptText: string;
  promptVariables: Record<string, unknown>;
}

export interface WriteShotScriptRawResponseInput {
  taskStorageDir: string;
  rawResponse: string;
}

export interface ShotScriptStorage {
  initializePromptTemplate(
    input: InitializeShotScriptPromptTemplateInput,
  ): Promise<void> | void;
  readPromptTemplate(
    input: ReadShotScriptPromptTemplateInput,
  ): Promise<string> | string;
  writePromptSnapshot(
    input: WriteShotScriptPromptSnapshotInput,
  ): Promise<void> | void;
  writeRawResponse(input: WriteShotScriptRawResponseInput): Promise<void> | void;
  writeShotScriptVersion(
    input: WriteShotScriptVersionInput,
  ): Promise<void> | void;
  readShotScriptVersion(
    input: ReadShotScriptVersionInput,
  ): Promise<CurrentShotScript> | CurrentShotScript;
  writeCurrentShotScript(
    input: WriteCurrentShotScriptInput,
  ): Promise<void> | void;
  readCurrentShotScript(
    input: ReadCurrentShotScriptInput,
  ): Promise<CurrentShotScript | null> | CurrentShotScript | null;
}
