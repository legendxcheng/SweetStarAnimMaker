import { initialProjectStatus, type ProjectStatus } from "@sweet-star/shared";

import { originalScriptRelPath } from "./project-script";

export interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  storageDir: string;
  scriptRelPath: string;
  scriptBytes: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  scriptUpdatedAt: string;
}

export interface CreateProjectRecordInput {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  scriptUpdatedAt: string;
  scriptBytes?: number;
  status?: ProjectStatus;
}

export function toProjectStorageDir(projectId: string, slug: string) {
  return `projects/${projectId}-${slug}`;
}

export function toProjectSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "project";
}

export function createProjectRecord(input: CreateProjectRecordInput): ProjectRecord {
  return {
    ...input,
    scriptBytes: input.scriptBytes ?? 0,
    status: input.status ?? initialProjectStatus,
    storageDir: toProjectStorageDir(input.id, input.slug),
    scriptRelPath: originalScriptRelPath,
  };
}
