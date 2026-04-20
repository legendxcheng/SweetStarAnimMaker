import { describe, expect, it, vi } from "vitest";

import {
  ProjectValidationError,
  createApproveAllVideoSegmentsUseCase,
  createSegmentVideoRecord,
  createVideoBatchRecord,
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

function createSegment(
  id: string,
  overrides?: Partial<ReturnType<typeof createSegmentVideoRecord>>,
) {
  return createSegmentVideoRecord({
    id,
    batchId: "video_batch_1",
    projectId: "proj_1",
    projectStorageDir: "projects/proj_1-my-story",
    sourceImageBatchId: "image_batch_1",
    sourceShotScriptId: "shot_script_1",
    sceneId: "scene_1",
    segmentId: id,
    segmentOrder: 1,
    segmentSummary: `${id} summary`,
    shotCount: 1,
    sourceShotIds: ["shot_1"],
    status: "in_review",
    videoAssetPath: `videos/batches/video_batch_1/segments/scene_1__${id}/current.mp4`,
    updatedAt: "2026-04-19T10:00:00.000Z",
    ...overrides,
  });
}

function createVideoRepository(segments: ReturnType<typeof createSegment>[] ) {
  return {
    findBatchById: vi.fn().mockResolvedValue(
      createVideoBatchRecord({
        id: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentCount: segments.length,
        createdAt: "2026-04-19T10:00:00.000Z",
        updatedAt: "2026-04-19T10:00:00.000Z",
      }),
    ),
    listSegmentsByBatchId: vi.fn().mockResolvedValue(segments),
    updateSegment: vi.fn(),
  };
}

describe("approve all video segments use case", () => {
  it("approves review-ready segments, preserves existing approvals, and marks the project approved", async () => {
    const projectRepository = createProjectRepository();
    const alreadyApprovedSegment = createSegment("video_segment_1", {
      status: "approved",
      approvedAt: "2026-04-19T09:50:00.000Z",
    });
    const readySegment = createSegment("video_segment_2");
    const videoRepository = createVideoRepository([alreadyApprovedSegment, readySegment]);
    const useCase = createApproveAllVideoSegmentsUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(videoRepository.updateSegment).toHaveBeenCalledTimes(1);
    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_2",
        status: "approved",
        approvedAt: "2026-04-19T10:05:00.000Z",
      }),
    );
    expect(result.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "video_segment_1",
          approvedAt: "2026-04-19T09:50:00.000Z",
          status: "approved",
        }),
        expect.objectContaining({
          id: "video_segment_2",
          status: "approved",
        }),
      ]),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_approved",
      updatedAt: "2026-04-19T10:05:00.000Z",
    });
  });

  it("rejects approve-all when any in-review segment is missing a generated video asset", async () => {
    const projectRepository = createProjectRepository();
    const videoRepository = createVideoRepository([
      createSegment("video_segment_1"),
      createSegment("video_segment_2", {
        videoAssetPath: null,
      }),
    ]);
    const useCase = createApproveAllVideoSegmentsUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toThrow(
      "All segment videos must be generated before approval",
    );
    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toBeInstanceOf(
      ProjectValidationError,
    );

    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects approve-all when any segment is still generating", async () => {
    const projectRepository = createProjectRepository();
    const videoRepository = createVideoRepository([
      createSegment("video_segment_1"),
      createSegment("video_segment_2", {
        status: "generating",
      }),
    ]);
    const useCase = createApproveAllVideoSegmentsUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toBeInstanceOf(
      ProjectValidationError,
    );

    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects approve-all when any segment has failed", async () => {
    const projectRepository = createProjectRepository();
    const videoRepository = createVideoRepository([
      createSegment("video_segment_1"),
      createSegment("video_segment_2", {
        status: "failed",
        videoAssetPath: null,
      }),
    ]);
    const useCase = createApproveAllVideoSegmentsUseCase({
      projectRepository: projectRepository as never,
      videoRepository: videoRepository as never,
      clock: { now: () => "2026-04-19T10:05:00.000Z" },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toBeInstanceOf(
      ProjectValidationError,
    );

    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });
});
