import type { ProjectStatus } from "../constants/project-status";
import type { CurrentMasterPlot } from "./master-plot";

export interface ProjectPremiseMetadata {
  path: string;
  bytes: number;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  storageDir: string;
  createdAt: string;
  updatedAt: string;
  premise: ProjectPremiseMetadata;
  currentMasterPlot: CurrentMasterPlot | null;
}
