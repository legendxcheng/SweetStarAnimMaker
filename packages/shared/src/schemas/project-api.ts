import { z } from "zod";

import { initialProjectStatus, projectStatuses } from "../constants/project-status";
import { storyboardVersionResponseSchema } from "./storyboard-api";

const requiredTextSchema = z.string().trim().min(1);

export const createProjectRequestSchema = z.object({
  name: requiredTextSchema,
  script: requiredTextSchema,
});

export const updateProjectScriptRequestSchema = z.object({
  script: requiredTextSchema,
});

export const projectSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(projectStatuses).default(initialProjectStatus),
  storageDir: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentStoryboard: storyboardVersionResponseSchema.nullable(),
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
  script: z.object({
    path: z.string(),
    bytes: z.number().int().nonnegative(),
    updatedAt: z.string(),
  }),
  currentStoryboard: storyboardVersionResponseSchema.nullable(),
});

