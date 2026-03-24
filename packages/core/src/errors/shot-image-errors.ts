export class CurrentImageBatchNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current image batch not found for project: ${projectId}`);
    this.name = "CurrentImageBatchNotFoundError";
  }
}

export class ShotImageNotFoundError extends Error {
  constructor(frameId: string) {
    super(`Shot image frame not found: ${frameId}`);
    this.name = "ShotImageNotFoundError";
  }
}
