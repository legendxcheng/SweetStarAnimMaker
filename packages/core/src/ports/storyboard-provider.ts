import type { SaveMasterPlotRequest } from "@sweet-star/shared";

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
