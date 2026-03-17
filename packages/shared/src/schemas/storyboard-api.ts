import { z } from "zod";

import { storyboardVersionKinds } from "../constants/storyboard-version-kind";

const storyboardSceneSchema = z.object({
  id: z.string(),
  sceneIndex: z.number().int().positive(),
  description: z.string(),
  camera: z.string(),
  characters: z.array(z.string()),
  prompt: z.string(),
});

export const storyboardVersionResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  versionNumber: z.number().int().positive(),
  kind: z.enum(storyboardVersionKinds),
  provider: z.string(),
  model: z.string(),
  filePath: z.string(),
  createdAt: z.string(),
  sourceTaskId: z.string(),
});

export const currentStoryboardResponseSchema = storyboardVersionResponseSchema.extend({
  summary: z.string(),
  scenes: z.array(storyboardSceneSchema),
});
