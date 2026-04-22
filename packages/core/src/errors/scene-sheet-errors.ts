export class CurrentSceneSheetBatchNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Current scene sheet batch not found for project: ${projectId}`);
    this.name = "CurrentSceneSheetBatchNotFoundError";
  }
}

export class SceneSheetNotFoundError extends Error {
  constructor(sceneId: string) {
    super(`Scene sheet not found: ${sceneId}`);
    this.name = "SceneSheetNotFoundError";
  }
}
