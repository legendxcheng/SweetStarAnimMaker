export const videoReferenceStrategies = [
  "auto",
  "with_frame_refs",
  "without_frame_refs",
] as const;

export type VideoReferenceStrategy = (typeof videoReferenceStrategies)[number];

export interface UpdateProjectRequest {
  videoReferenceStrategy?: VideoReferenceStrategy;
}
