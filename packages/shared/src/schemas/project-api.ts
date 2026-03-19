import { z } from "zod";

import { initialProjectStatus, projectStatuses } from "../constants/project-status";
import { currentMasterPlotResponseSchema } from "./storyboard-api";

const requiredTextSchema = z.string().trim().min(1);
const premiseMetadataSchema = z.object({
  path: z.string(),
  bytes: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const createProjectRequestSchema = z.object({
  name: requiredTextSchema,
  premiseText: requiredTextSchema,
});

export const projectSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(projectStatuses).default(initialProjectStatus),
  storageDir: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentMasterPlot: currentMasterPlotResponseSchema.nullable(),
});

export const projectListResponseSchema = z.array(projectSummaryResponseSchema);

export const projectDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(projectStatuses).default(initialProjectStatus),
  storageDir: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  premise: premiseMetadataSchema,
  currentMasterPlot: currentMasterPlotResponseSchema.nullable(),
});
