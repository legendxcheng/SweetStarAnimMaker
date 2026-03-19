import type { CurrentMasterPlot } from "@sweet-star/shared";

export const masterPlotDirectoryName = "master-plot";
export const currentMasterPlotJsonFileName = "current.json";
export const currentMasterPlotMarkdownFileName = "current.md";
export const currentMasterPlotJsonRelPath =
  `${masterPlotDirectoryName}/${currentMasterPlotJsonFileName}`;
export const currentMasterPlotMarkdownRelPath =
  `${masterPlotDirectoryName}/${currentMasterPlotMarkdownFileName}`;

export type CurrentMasterPlotRecord = CurrentMasterPlot;

export function toCurrentMasterPlotRecord(
  masterPlot: CurrentMasterPlot,
): CurrentMasterPlotRecord {
  return masterPlot;
}
