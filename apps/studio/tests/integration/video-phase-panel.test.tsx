import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoPhasePanel } from "../../src/components/video-phase-panel";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const baseProject = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "videos_in_review" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  currentMasterPlot: null,
  currentCharacterSheetBatch: null,
  currentStoryboard: null,
  currentShotScript: null,
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 1,
    totalFrameCount: 2,
    approvedFrameCount: 2,
    updatedAt: "2024-01-01T00:00:09Z",
  },
  currentVideoBatch: {
    id: "video-batch-1",
    sourceImageBatchId: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    segmentCount: 1,
    approvedSegmentCount: 0,
    updatedAt: "2024-01-01T00:00:10Z",
  },
};

const videoListResponse = {
  currentBatch: baseProject.currentVideoBatch,
  segments: [
    {
      id: "video-segment-1",
      projectId: "proj-1",
      batchId: "video-batch-1",
      sourceImageBatchId: "image-batch-1",
      sourceShotScriptId: "shot-script-1",
      segmentId: "segment-1",
      sceneId: "scene-1",
      order: 1,
      status: "in_review" as const,
      promptTextSeed: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
      promptTextCurrent: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
      promptUpdatedAt: "2024-01-01T00:00:11Z",
      videoAssetPath: "videos/batches/video-batch-1/segments/segment-1/current.mp4",
      thumbnailAssetPath: "videos/batches/video-batch-1/segments/segment-1/thumbnail.webp",
      durationSec: 6,
      provider: "vector-engine",
      model: "sora-2-all",
      updatedAt: "2024-01-01T00:00:12Z",
      approvedAt: null,
      sourceTaskId: "task-video-segment-1",
    },
  ],
};

function renderPanel(overrides?: Partial<ComponentProps<typeof VideoPhasePanel>>) {
  return render(
    <VideoPhasePanel
      project={baseProject}
      task={null}
      taskError={null}
      creatingTask={false}
      disableGenerate={false}
      onGenerate={vi.fn()}
      onProjectRefresh={vi.fn()}
      {...overrides}
    />,
  );
}

describe("VideoPhasePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the current video batch and supports prompt editing plus segment and batch actions", async () => {
    const refreshProject = vi.fn();
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue(videoListResponse);
    vi.spyOn(apiModule.apiClient, "updateVideoPrompt").mockResolvedValue({
      ...videoListResponse.segments[0],
      promptTextCurrent: "用户改写后的视频提示词",
      promptUpdatedAt: "2024-01-01T00:00:12Z",
      updatedAt: "2024-01-01T00:00:12Z",
    });
    vi.spyOn(apiModule.apiClient, "regenerateVideoPrompt").mockResolvedValue({
      ...videoListResponse.segments[0],
      promptTextCurrent: "重新生成后的视频提示词",
      promptUpdatedAt: "2024-01-01T00:00:13Z",
      updatedAt: "2024-01-01T00:00:13Z",
    });
    vi.spyOn(apiModule.apiClient, "regenerateAllVideoPrompts").mockResolvedValue({
      currentBatch: videoListResponse.currentBatch,
      segments: [
        {
          ...videoListResponse.segments[0],
          promptTextCurrent: "批量重生成后的视频提示词",
          promptUpdatedAt: "2024-01-01T00:00:14Z",
          updatedAt: "2024-01-01T00:00:14Z",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "regenerateVideoSegment").mockResolvedValue({
      id: "task-video-segment-regen-1",
      projectId: "proj-1",
      type: "segment_video_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:13Z",
      updatedAt: "2024-01-01T00:00:13Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-video-segment-regen-1/input.json",
        outputPath: "tasks/task-video-segment-regen-1/output.json",
        logPath: "tasks/task-video-segment-regen-1/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "approveVideoSegment").mockResolvedValue({
      ...videoListResponse.segments[0],
      status: "approved",
      approvedAt: "2024-01-01T00:00:14Z",
      updatedAt: "2024-01-01T00:00:14Z",
    });
    vi.spyOn(apiModule.apiClient, "approveAllVideoSegments").mockResolvedValue({
      currentBatch: {
        ...videoListResponse.currentBatch,
        approvedSegmentCount: 1,
        updatedAt: "2024-01-01T00:00:15Z",
      },
      segments: [
        {
          ...videoListResponse.segments[0],
          status: "approved" as const,
          approvedAt: "2024-01-01T00:00:15Z",
          updatedAt: "2024-01-01T00:00:15Z",
        },
      ],
    });

    renderPanel({ onProjectRefresh: refreshProject });

    await waitFor(() => {
      expect(apiModule.apiClient.listVideos).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByText("Segment 1")).toBeInTheDocument();
    expect(screen.getByText("scene-1 / segment-1")).toBeInTheDocument();
    expect(screen.getByText("sora-2-all")).toBeInTheDocument();
    expect(screen.getByText("vector-engine")).toBeInTheDocument();
    expect(screen.getByText("6s")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成所有段落提示词" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成所有视频段落" })).toBeInTheDocument();

    fireEvent.change(
      screen.getByDisplayValue("雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。"),
      {
        target: { value: "用户改写后的视频提示词" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));
    await waitFor(() => {
      expect(apiModule.apiClient.updateVideoPrompt).toHaveBeenCalledWith("proj-1", "video-segment-1", {
        promptTextCurrent: "用户改写后的视频提示词",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成当前段落提示词" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateVideoPrompt).toHaveBeenCalledWith(
        "proj-1",
        "video-segment-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成所有段落提示词" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateAllVideoPrompts).toHaveBeenCalledWith("proj-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成当前片段" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateVideoSegment).toHaveBeenCalledWith(
        "proj-1",
        "video-segment-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成所有视频段落" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateVideoSegment).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "审核通过当前片段" }));
    await waitFor(() => {
      expect(apiModule.apiClient.approveVideoSegment).toHaveBeenCalledWith(
        "proj-1",
        "video-segment-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "全部视频审核通过" }));
    await waitFor(() => {
      expect(apiModule.apiClient.approveAllVideoSegments).toHaveBeenCalledWith("proj-1");
    });

    expect(refreshProject).toHaveBeenCalledTimes(4);
  });

  it("disables video regeneration while a prompt draft is unsaved", async () => {
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue(videoListResponse);
    vi.spyOn(apiModule.apiClient, "updateVideoPrompt").mockResolvedValue({
      ...videoListResponse.segments[0],
      promptTextCurrent: "新的保存后提示词",
      promptUpdatedAt: "2024-01-01T00:00:12Z",
      updatedAt: "2024-01-01T00:00:12Z",
    });

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listVideos).toHaveBeenCalledWith("proj-1");
    });

    fireEvent.change(
      screen.getByDisplayValue("雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。"),
      {
        target: { value: "新的保存后提示词" },
      },
    );

    expect(screen.getByRole("button", { name: "保存提示词" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "重新生成当前片段" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "重新生成所有视频段落" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));

    await waitFor(() => {
      expect(apiModule.apiClient.updateVideoPrompt).toHaveBeenCalledWith("proj-1", "video-segment-1", {
        promptTextCurrent: "新的保存后提示词",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "保存提示词" })).not.toBeInTheDocument();
    });
  });

  it("shows the generate entry when the current video batch does not exist", () => {
    const onGenerate = vi.fn();

    renderPanel({
      project: {
        ...baseProject,
        status: "images_approved",
        currentVideoBatch: null,
      },
      onGenerate,
    });

    fireEvent.click(screen.getByRole("button", { name: "开始生成视频" }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/为每个 Segment 生成一个可审核视频片段/i)).toBeInTheDocument();
  });

  it("reloads the current batch after project status changes for the same batch", async () => {
    const generatingProject = {
      ...baseProject,
      status: "videos_generating" as const,
      updatedAt: "2024-01-01T00:00:20Z",
    };
    const refreshedProject = {
      ...generatingProject,
      status: "videos_in_review" as const,
      updatedAt: "2024-01-01T00:00:30Z",
    };
    const listVideos = vi
      .spyOn(apiModule.apiClient, "listVideos")
      .mockResolvedValueOnce({
        currentBatch: generatingProject.currentVideoBatch,
        segments: [
          {
            ...videoListResponse.segments[0],
            status: "generating" as const,
            videoAssetPath: null,
            thumbnailAssetPath: null,
            updatedAt: "2024-01-01T00:00:20Z",
          },
        ],
      })
      .mockResolvedValueOnce(videoListResponse);

    const view = renderPanel({
      project: generatingProject,
    });

    await waitFor(() => {
      expect(listVideos).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("当前 Segment 还没有可播放视频")).toBeInTheDocument();

    view.rerender(
      <VideoPhasePanel
        project={refreshedProject}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(listVideos).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText("vector-engine")).toBeInTheDocument();
  });
});
