import {
  createProjectRequestSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  resetProjectPremiseRequestSchema,
  type ProjectDetail,
  type ProjectSummary,
} from "@sweet-star/shared";

import { http, jsonBody } from "./shared";

export const projectsApi = {
  listProjects: () =>
    http.get<ProjectSummary[]>("/projects", projectListResponseSchema),

  createProject: (data: { name: string; premiseText: string; visualStyleText?: string }) =>
    http.post<ProjectDetail>("/projects", projectDetailResponseSchema, {
      body: jsonBody(createProjectRequestSchema, data),
    }),

  getProjectDetail: (projectId: string) =>
    http.get<ProjectDetail>(`/projects/${projectId}`, projectDetailResponseSchema),

  resetProjectPremise: (
    projectId: string,
    data: { premiseText: string; visualStyleText?: string; confirmReset: true },
  ) =>
    http.put<ProjectDetail>(
      `/projects/${projectId}/premise/reset`,
      projectDetailResponseSchema,
      {
        body: jsonBody(resetProjectPremiseRequestSchema, data),
      },
    ),
};
