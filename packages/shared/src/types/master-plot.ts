export interface CurrentMasterPlot {
  id: string;
  title: string | null;
  logline: string;
  synopsis: string;
  mainCharacters: string[];
  coreConflict: string;
  emotionalArc: string;
  endingBeat: string;
  targetDurationSec: number | null;
  sourceTaskId: string | null;
  updatedAt: string;
  approvedAt: string | null;
}
