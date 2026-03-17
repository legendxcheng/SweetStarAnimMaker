export class CurrentStoryboardNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current storyboard not found for project: ${projectId}`);
    this.name = "CurrentStoryboardNotFoundError";
  }
}
