export class CurrentVideoBatchNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current video batch not found for project: ${projectId}`);
    this.name = "CurrentVideoBatchNotFoundError";
  }
}

export class SegmentVideoNotFoundError extends Error {
  constructor(segmentId: string) {
    super(`Segment video not found: ${segmentId}`);
    this.name = "SegmentVideoNotFoundError";
  }
}
