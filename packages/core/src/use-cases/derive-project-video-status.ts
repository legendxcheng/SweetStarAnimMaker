import type { ProjectStatus } from "@sweet-star/shared";

interface ProjectVideoStatusSegment {
  id: string;
  status: string;
  sourceTaskId?: string | null;
  promptTextSeed?: string | null;
  promptTextCurrent?: string | null;
  videoAssetPath?: string | null;
  thumbnailAssetPath?: string | null;
}

export function normalizeStaleGeneratingVideoSegment<T extends ProjectVideoStatusSegment>(
  segment: T,
): T {
  const hasPrompt =
    (segment.promptTextSeed ?? "").trim().length > 0 ||
    (segment.promptTextCurrent ?? "").trim().length > 0;

  if (segment.status !== "generating" || segment.sourceTaskId !== null || !hasPrompt) {
    return segment;
  }

  return {
    ...segment,
    status: "in_review",
    videoAssetPath: null,
    thumbnailAssetPath: null,
  };
}

export function deriveProjectVideoStatusFromSegments(
  segments: ProjectVideoStatusSegment[],
): ProjectStatus {
  const normalizedSegments = segments.map(normalizeStaleGeneratingVideoSegment);

  if (normalizedSegments.some((segment) => segment.status === "generating")) {
    return "videos_generating";
  }

  if (normalizedSegments.length > 0 && normalizedSegments.every((segment) => segment.status === "approved")) {
    return "videos_approved";
  }

  return "videos_in_review";
}

export function deriveProjectVideoStatus(
  segments: Array<{ id: string; status: string }>,
  updatedSegment: { id: string; status: string },
): ProjectStatus {
  const nextSegments = segments.some((segment) => segment.id === updatedSegment.id)
    ? segments.map((segment) => (segment.id === updatedSegment.id ? updatedSegment : segment))
    : [...segments, updatedSegment];

  return deriveProjectVideoStatusFromSegments(nextSegments);
}
