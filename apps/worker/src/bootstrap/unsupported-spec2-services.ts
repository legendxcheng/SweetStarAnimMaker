import type {
  ShotImageRepository,
  ShotImageStorage,
  ShotScriptStorage,
  VideoRepository,
  VideoStorage,
} from "@sweet-star/core";

export function createUnsupportedShotScriptStorage(): ShotScriptStorage {
  return {
    async initializePromptTemplate() {},
    async readPromptTemplate() {
      throw new Error("Shot script storage is not configured");
    },
    async writePromptSnapshot() {},
    async writeRawResponse() {},
    async writeShotScriptVersion() {},
    async readShotScriptVersion() {
      throw new Error("Shot script storage is not configured");
    },
    async writeCurrentShotScript() {},
    async readCurrentShotScript() {
      return null;
    },
  };
}

export function createUnsupportedShotImageRepository(): ShotImageRepository {
  return {
    insertBatch() {
      throw new Error("Shot image repository is not configured");
    },
    findBatchById() {
      throw new Error("Shot image repository is not configured");
    },
    findCurrentBatchByProjectId() {
      throw new Error("Shot image repository is not configured");
    },
    listFramesByBatchId() {
      throw new Error("Shot image repository is not configured");
    },
    listShotsByBatchId() {
      throw new Error("Shot image repository is not configured");
    },
    insertFrame() {
      throw new Error("Shot image repository is not configured");
    },
    findFrameById() {
      throw new Error("Shot image repository is not configured");
    },
    updateFrame() {
      throw new Error("Shot image repository is not configured");
    },
  };
}

export function createUnsupportedShotImageStorage(): ShotImageStorage {
  return {
    async writeBatchManifest() {
      throw new Error("Shot image storage is not configured");
    },
    async writeFramePlanning() {
      throw new Error("Shot image storage is not configured");
    },
    async readFramePlanning() {
      throw new Error("Shot image storage is not configured");
    },
    async writeFramePromptFiles() {
      throw new Error("Shot image storage is not configured");
    },
    async writeFramePromptVersion() {
      throw new Error("Shot image storage is not configured");
    },
    async writeCurrentImage() {
      throw new Error("Shot image storage is not configured");
    },
    async writeImageVersion() {
      throw new Error("Shot image storage is not configured");
    },
    async readCurrentFrame() {
      throw new Error("Shot image storage is not configured");
    },
    resolveProjectAssetPath() {
      throw new Error("Shot image storage is not configured");
    },
  };
}

export function createUnsupportedVideoRepository(): VideoRepository {
  return {
    insertBatch() {
      throw new Error("Video repository is not configured");
    },
    findBatchById() {
      throw new Error("Video repository is not configured");
    },
    findCurrentBatchByProjectId() {
      throw new Error("Video repository is not configured");
    },
    listSegmentsByBatchId() {
      throw new Error("Video repository is not configured");
    },
    insertSegment() {
      throw new Error("Video repository is not configured");
    },
    findSegmentById() {
      throw new Error("Video repository is not configured");
    },
    findCurrentSegmentByProjectIdAndSegmentId() {
      throw new Error("Video repository is not configured");
    },
    findCurrentSegmentByProjectIdAndSceneIdAndSegmentId() {
      throw new Error("Video repository is not configured");
    },
    updateSegment() {
      throw new Error("Video repository is not configured");
    },
    findCurrentFinalCutByProjectId() {
      throw new Error("Video repository is not configured");
    },
    upsertFinalCut() {
      throw new Error("Video repository is not configured");
    },
  };
}

export function createUnsupportedVideoStorage(): VideoStorage {
  return {
    async initializePromptTemplate() {
      throw new Error("Video storage is not configured");
    },
    async readPromptTemplate() {
      throw new Error("Video storage is not configured");
    },
    async writePromptSnapshot() {
      throw new Error("Video storage is not configured");
    },
    async writePromptPlan() {
      throw new Error("Video storage is not configured");
    },
    async writeRawResponse() {
      throw new Error("Video storage is not configured");
    },
    async writeBatchManifest() {
      throw new Error("Video storage is not configured");
    },
    async writeCurrentVideo() {
      throw new Error("Video storage is not configured");
    },
    async writeVideoVersion() {
      throw new Error("Video storage is not configured");
    },
    async writeFinalCutManifest() {
      throw new Error("Video storage is not configured");
    },
    async writeFinalCutFiles() {
      throw new Error("Video storage is not configured");
    },
    resolveProjectAssetPath() {
      throw new Error("Video storage is not configured");
    },
  };
}
