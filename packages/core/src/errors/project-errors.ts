export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = "ProjectNotFoundError";
  }
}
