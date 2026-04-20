import { describe, expect, it, vi } from "vitest";

import {
  ProjectValidationError,
  createApproveVideoSegmentUseCase,
  createSegmentVideoRecord,
} from "../src/index";

function createProjectRepository() {
  return {
    findById: vi.fn().mockResolvedValue({
      id: "proj_1",
      currentVideoBatchId: "video_batch_1",
    }),
    updateStatus: vi.fn(),
  };
}

function createSegmentRepositoryMocks(overrides?: {
  segment?: ReturnType<typeof createSegmentVideoRecord>;
  batchSegments?: ReturnType<typeof createSegmentVideoRecord>[];
}) {
  const segment =
    overrides?.segment ??
    createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentSummary: "Segment summary",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      status: "in_review",
      videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
      updatedAt: "2026-04-19T10:00:00.000Z",
    });

  return {
    findSegmentById: vi.fn().mockResolvedValue(segment),
    updateSegment: vi.fn(),
    listSegmentsByBatchId: vi
      .fn()
      .mockResolvedValue(overrides?.batchSegments ?? [segment]),
  };
}

describe("approve video segment use case", () => {
  it("approves a review-ready segment and marks the project approved when all current-batch segments are approved", async () => {
    const projectRepository = createProjectRepository();
    const readySegment = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentSummary: "Segment summary",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      status: "in_review",
      videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
      updatedAt: "2026-04-19T10:00:00.000Z",
    });
    const videoRepository = createSegmentRepositoryMocks({
      segment: readySegment,
    });
    const useCase = createApproveVideoSegmentUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      videoId: "video_segment_1",
    });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_1",
        status: "approved",
        approvedAt: "2026-04-19T10:05:00.000Z",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_approved",
      updatedAt: "2026-04-19T10:05:00.000Z",
    });
    expect(result.status).toBe("approved");
  });

  it("rejects approval when an in-review segment has no generated video asset", async () => {
    const projectRepository = createProjectRepository();
    const segmentWithoutAsset = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentSummary: "Segment summary",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      status: "in_review",
      videoAssetPath: null,
      updatedAt: "2026-04-19T10:00:00.000Z",
    });
    const videoRepository = createSegmentRepositoryMocks({
      segment: segmentWithoutAsset,
    });
    const useCase = createApproveVideoSegmentUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        videoId: "video_segment_1",
      }),
    ).rejects.toThrow("Segment video is not ready for approval");
    await expect(
      useCase.execute({
        projectId: "proj_1",
        videoId: "video_segment_1",
      }),
    ).rejects.toBeInstanceOf(ProjectValidationError);

    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects approval for generating segments even when they already have a video asset path", async () => {
    const projectRepository = createProjectRepository();
    const generatingSegment = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentSummary: "Segment summary",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      status: "generating",
      videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
      updatedAt: "2026-04-19T10:00:00.000Z",
    });
    const videoRepository = createSegmentRepositoryMocks({
      segment: generatingSegment,
    });
    const useCase = createApproveVideoSegmentUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        videoId: "video_segment_1",
      }),
    ).rejects.toBeInstanceOf(ProjectValidationError);

    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects approval for failed segments", async () => {
    const projectRepository = createProjectRepository();
    const failedSegment = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentSummary: "Segment summary",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      status: "failed",
      videoAssetPath: null,
      updatedAt: "2026-04-19T10:00:00.000Z",
    });
    const videoRepository = createSegmentRepositoryMocks({
      segment: failedSegment,
    });
    const useCase = createApproveVideoSegmentUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        videoId: "video_segment_1",
      }),
    ).rejects.toBeInstanceOf(ProjectValidationError);

    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });
});
