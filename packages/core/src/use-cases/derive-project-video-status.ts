import type { ProjectStatus } from "@sweet-star/shared";

export function deriveProjectVideoStatus(
  segments: Array<{ id: string; status: string }>,
  updatedSegment: { id: string; status: string },
): ProjectStatus {
  const nextSegments = segments.some((segment) => segment.id === updatedSegment.id)
    ? segments.map((segment) => (segment.id === updatedSegment.id ? updatedSegment : segment))
    : [...segments, updatedSegment];

  if (nextSegments.some((segment) => segment.status === "generating")) {
    return "videos_generating";
  }

  if (nextSegments.every((segment) => segment.status === "approved")) {
    return "videos_approved";
  }

  return "videos_in_review";
}
