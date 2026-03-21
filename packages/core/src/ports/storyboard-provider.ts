import type { CurrentStoryboard, SaveMasterPlotRequest } from "@sweet-star/shared";

export interface GenerateMasterPlotInput {
  projectId: string;
  premiseText: string;
  promptText: string;
}

export interface GenerateMasterPlotResult {
  rawResponse: string;
  masterPlot: SaveMasterPlotRequest;
  provider: string;
  model: string;
}

export interface MasterPlotProvider {
  generateMasterPlot(
    input: GenerateMasterPlotInput,
  ): Promise<GenerateMasterPlotResult> | GenerateMasterPlotResult;
}

export interface GenerateStoryboardInput {
  projectId: string;
  masterPlot: SaveMasterPlotRequest;
  promptText: string;
}

export interface GenerateStoryboardResult {
  rawResponse: string;
  storyboard: CurrentStoryboard;
  provider: string;
  model: string;
}

export interface StoryboardProvider {
  generateStoryboard(
    input: GenerateStoryboardInput,
  ): Promise<GenerateStoryboardResult> | GenerateStoryboardResult;
}
