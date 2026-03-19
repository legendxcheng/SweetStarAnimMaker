import type { CurrentMasterPlot } from "@sweet-star/shared";
import type { StoryboardDocument, StoryboardVersionRecord } from "../domain/storyboard";

export interface WriteStoryboardRawResponseInput {
  version: StoryboardVersionRecord;
  rawResponse: unknown;
}

export interface WriteStoryboardVersionInput {
  version: StoryboardVersionRecord;
  storyboard: StoryboardDocument;
}

export interface ReadStoryboardVersionInput {
  version: StoryboardVersionRecord;
}

export interface StoryboardStorage {
  writeRawResponse(
    input: WriteStoryboardRawResponseInput,
  ): Promise<void> | void;
  writeStoryboardVersion(
    input: WriteStoryboardVersionInput,
  ): Promise<void> | void;
  readStoryboardVersion(
    input: ReadStoryboardVersionInput,
  ): Promise<StoryboardDocument> | StoryboardDocument;
}

export interface WriteCurrentMasterPlotInput {
  storageDir: string;
  masterPlot: CurrentMasterPlot;
}

export interface InitializePromptTemplateInput {
  storageDir: string;
  promptTemplateKey: "master_plot.generate";
}

export interface ReadPromptTemplateInput {
  storageDir: string;
  promptTemplateKey: "master_plot.generate";
}

export interface ReadCurrentMasterPlotInput {
  storageDir: string;
}

export interface WritePromptSnapshotInput {
  taskStorageDir: string;
  promptText: string;
  promptVariables: Record<string, unknown>;
}

export interface WriteRawResponseInput {
  taskStorageDir: string;
  rawResponse: string;
}

export interface MasterPlotStorage {
  initializePromptTemplate(
    input: InitializePromptTemplateInput,
  ): Promise<void> | void;
  readPromptTemplate(
    input: ReadPromptTemplateInput,
  ): Promise<string> | string;
  writeCurrentMasterPlot(input: WriteCurrentMasterPlotInput): Promise<void> | void;
  readCurrentMasterPlot(
    input: ReadCurrentMasterPlotInput,
  ): Promise<CurrentMasterPlot | null> | CurrentMasterPlot | null;
  writePromptSnapshot(input: WritePromptSnapshotInput): Promise<void> | void;
  writeRawResponse(input: WriteRawResponseInput): Promise<void> | void;
}
