import { z } from "zod";

import { taskStatuses } from "../constants/task-status";
import { taskTypes } from "../constants/task-type";

const taskFileMetadataSchema = z.object({
  inputPath: z.string(),
  outputPath: z.string(),
  logPath: z.string(),
});

export const taskDetailResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: z.enum(taskTypes),
  status: z.enum(taskStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  files: taskFileMetadataSchema,
});

export const createMasterPlotGenerateTaskResponseSchema = taskDetailResponseSchema;
