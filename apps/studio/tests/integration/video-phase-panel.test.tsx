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
    shotCount: 1,
    totalRequiredFrameCount: 2,
    approvedShotCount: 1,
    updatedAt: "2024-01-01T00:00:09Z",
  },
  currentVideoBatch: {
    id: "video-batch-1",
    sourceImageBatchId: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    shotCount: 1,
    approvedShotCount: 0,
    updatedAt: "2024-01-01T00:00:10Z",
  },
};

function createVideoShot(
  overrides: Partial<{
    id: string;
    projectId: string;
    batchId: string;
    sourceImageBatchId: string;
    sourceShotScriptId: string;
    shotId: string;
    shotCode: string;
    sceneId: string;
    segmentId: string;
    segmentOrder: number;
    shotOrder: number;
    frameDependency: "start_frame_only" | "start_and_end_frame";
    status: "generating" | "in_review" | "approved" | "failed";
    promptTextSeed: string;
    promptTextCurrent: string;
    promptUpdatedAt: string;
    videoAssetPath: string | null;
    thumbnailAssetPath: string | null;
    durationSec: number | null;
    provider: string | null;
    model: string | null;
    updatedAt: string;
    approvedAt: string | null;
    sourceTaskId: string | null;
  }> = {},
) {
  return {
    id: "video-shot-1",
    projectId: "proj-1",
    batchId: "video-batch-1",
    sourceImageBatchId: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    shotId: "shot-1",
    shotCode: "S01-SG01-SH01",
    sceneId: "scene-1",
    segmentId: "segment-1",
    segmentOrder: 1,
    shotOrder: 1,
    frameDependency: "start_and_end_frame" as const,
    status: "in_review" as const,
    promptTextSeed: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
    promptTextCurrent: "雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。",
    promptUpdatedAt: "2024-01-01T00:00:11Z",
    videoAssetPath: "videos/batches/video-batch-1/shots/shot-1/current.mp4",
    thumbnailAssetPath: "videos/batches/video-batch-1/shots/shot-1/thumbnail.webp",
    durationSec: 6,
    provider: "vector-engine",
    model: "sora-2-all",
    updatedAt: "2024-01-01T00:00:12Z",
    approvedAt: null,
    sourceTaskId: "task-video-shot-1",
    ...overrides,
  };
}

const videoListResponse = {
  currentBatch: baseProject.currentVideoBatch,
  shots: [createVideoShot()],
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

  it("loads the current video batch and supports prompt editing plus shot and batch actions", async () => {
    const refreshProject = vi.fn();
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue(videoListResponse);
    vi.spyOn(apiModule.apiClient, "updateVideoPrompt").mockResolvedValue({
      ...videoListResponse.shots[0],
      promptTextCurrent: "用户改写后的视频提示词",
      promptUpdatedAt: "2024-01-01T00:00:12Z",
      updatedAt: "2024-01-01T00:00:12Z",
    });
    vi.spyOn(apiModule.apiClient, "regenerateVideoPrompt").mockResolvedValue({
      ...videoListResponse.shots[0],
      promptTextCurrent: "重新生成后的视频提示词",
      promptUpdatedAt: "2024-01-01T00:00:13Z",
      updatedAt: "2024-01-01T00:00:13Z",
    });
    vi.spyOn(apiModule.apiClient, "regenerateAllVideoPrompts").mockResolvedValue({
      currentBatch: videoListResponse.currentBatch,
      shots: [
        {
          ...videoListResponse.shots[0],
          promptTextCurrent: "批量重生成后的视频提示词",
          promptUpdatedAt: "2024-01-01T00:00:14Z",
          updatedAt: "2024-01-01T00:00:14Z",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "regenerateVideoSegment").mockResolvedValue({
      id: "task-video-shot-regen-1",
      projectId: "proj-1",
      type: "segment_video_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:13Z",
      updatedAt: "2024-01-01T00:00:13Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-video-shot-regen-1/input.json",
        outputPath: "tasks/task-video-shot-regen-1/output.json",
        logPath: "tasks/task-video-shot-regen-1/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "approveVideoSegment").mockResolvedValue({
      ...videoListResponse.shots[0],
      status: "approved",
      approvedAt: "2024-01-01T00:00:14Z",
      updatedAt: "2024-01-01T00:00:14Z",
    });
    vi.spyOn(apiModule.apiClient, "approveAllVideoSegments").mockResolvedValue({
      currentBatch: {
        ...videoListResponse.currentBatch,
        approvedShotCount: 1,
        updatedAt: "2024-01-01T00:00:15Z",
      },
      shots: [
        {
          ...videoListResponse.shots[0],
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

    expect(screen.getByText("S01-SG01-SH01")).toBeInTheDocument();
    expect(screen.getByText("Shot ID")).toBeInTheDocument();
    expect(screen.getByText("shot-1")).toBeInTheDocument();
    expect(screen.getByText("起始帧 + 结束帧")).toBeInTheDocument();
    expect(screen.getByText("sora-2-all")).toBeInTheDocument();
    expect(screen.getByText("vector-engine")).toBeInTheDocument();
    expect(screen.getByText("6s")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成所有镜头提示词" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成所有镜头视频" })).toBeInTheDocument();

    fireEvent.change(
      screen.getByDisplayValue("雨夜市场里，林停步抬头，镜头平稳推进，保持角色与环境连续。"),
      {
        target: { value: "用户改写后的视频提示词" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));
    await waitFor(() => {
      expect(apiModule.apiClient.updateVideoPrompt).toHaveBeenCalledWith("proj-1", "video-shot-1", {
        promptTextCurrent: "用户改写后的视频提示词",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成当前镜头提示词" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateVideoPrompt).toHaveBeenCalledWith(
        "proj-1",
        "video-shot-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成所有镜头提示词" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateAllVideoPrompts).toHaveBeenCalledWith("proj-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成当前镜头视频" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateVideoSegment).toHaveBeenCalledWith(
        "proj-1",
        "video-shot-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "重新生成所有镜头视频" }));
    await waitFor(() => {
      expect(apiModule.apiClient.regenerateVideoSegment).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "审核通过当前镜头" }));
    await waitFor(() => {
      expect(apiModule.apiClient.approveVideoSegment).toHaveBeenCalledWith(
        "proj-1",
        "video-shot-1",
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
      ...videoListResponse.shots[0],
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
    expect(screen.getByRole("button", { name: "重新生成当前镜头视频" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "重新生成所有镜头视频" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "保存提示词" }));

    await waitFor(() => {
      expect(apiModule.apiClient.updateVideoPrompt).toHaveBeenCalledWith("proj-1", "video-shot-1", {
        promptTextCurrent: "新的保存后提示词",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "保存提示词" })).not.toBeInTheDocument();
    });
  });

  it("renders video cards in scene segment shot order when the API returns them unsorted", async () => {
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue({
      currentBatch: {
        ...baseProject.currentVideoBatch,
        shotCount: 4,
      },
      shots: [
        createVideoShot({
          id: "video-shot-4",
          shotId: "shot-2",
          shotCode: "S02-SG02-SH02",
          sceneId: "scene-2",
          segmentId: "segment-2",
          segmentOrder: 2,
          shotOrder: 2,
        }),
        createVideoShot({
          id: "video-shot-2",
          shotId: "shot-1",
          shotCode: "S01-SG02-SH01",
          sceneId: "scene-1",
          segmentId: "segment-2",
          segmentOrder: 2,
          shotOrder: 1,
        }),
        createVideoShot({
          id: "video-shot-1",
          shotId: "shot-2",
          shotCode: "S01-SG01-SH02",
          sceneId: "scene-1",
          segmentId: "segment-1",
          segmentOrder: 1,
          shotOrder: 2,
        }),
        createVideoShot({
          id: "video-shot-3",
          shotId: "shot-1",
          shotCode: "S02-SG01-SH01",
          sceneId: "scene-2",
          segmentId: "segment-1",
          segmentOrder: 1,
          shotOrder: 1,
        }),
      ],
    });

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listVideos).toHaveBeenCalledWith("proj-1");
    });

    expect(
      screen.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent),
    ).toEqual(["S01-SG01-SH02", "S01-SG02-SH01", "S02-SG01-SH01", "S02-SG02-SH02"]);
  });

  it("shows a prompt-only generate entry when the current video batch does not exist", () => {
    const onGenerate = vi.fn();

    renderPanel({
      project: {
        ...baseProject,
        status: "images_approved",
        currentVideoBatch: null,
      },
      onGenerate,
    });

    fireEvent.click(screen.getByRole("button", { name: "开始生成视频提示词" }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/先为每个 Shot 生成可编辑视频提示词，确认后再逐镜头或整批生成视频/i),
    ).toBeInTheDocument();
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
        shots: [
          {
            ...videoListResponse.shots[0],
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
    expect(screen.getByText("视频生成中...")).toBeInTheDocument();
    expect(document.querySelector("video")).not.toBeInTheDocument();

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

  it("shows a dedicated generating state on the shot card while a video is rendering", async () => {
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue({
      currentBatch: baseProject.currentVideoBatch,
      shots: [
        createVideoShot({
          status: "generating",
          videoAssetPath: "videos/batches/video-batch-1/shots/shot-1/previous.mp4",
          thumbnailAssetPath: "videos/batches/video-batch-1/shots/shot-1/previous.webp",
        }),
      ],
    });

    renderPanel({
      project: {
        ...baseProject,
        status: "videos_generating",
      },
    });

    await waitFor(() => {
      expect(apiModule.apiClient.listVideos).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByText("视频生成中...")).toBeInTheDocument();
    expect(document.querySelector("video")).not.toBeInTheDocument();
    expect(screen.getByTestId("video-shot-card-video-shot-1")).toHaveAttribute(
      "data-generating-state",
      "true",
    );
  });

  it("disables final cut generation until all shots are approved, then renders playback and download when ready", async () => {
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue(videoListResponse);
    vi.spyOn(apiModule.apiClient, "getFinalCut").mockResolvedValue({
      currentFinalCut: null,
    });

    const { rerender } = renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.getFinalCut).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByRole("button", { name: "生成成片" })).toBeDisabled();
    expect(screen.getByText("需先审核通过全部镜头片段后才能生成成片。")).toBeInTheDocument();

    vi.mocked(apiModule.apiClient.getFinalCut).mockResolvedValue({
      currentFinalCut: {
        id: "final_cut_1",
        projectId: "proj-1",
        sourceVideoBatchId: "video-batch-1",
        status: "ready",
        videoAssetPath: "final-cut/current.mp4",
        manifestAssetPath: "final-cut/manifests/final_cut_1.txt",
        shotCount: 1,
        createdAt: "2024-01-01T00:00:20Z",
        updatedAt: "2024-01-01T00:00:21Z",
        errorMessage: null,
      },
    });

    rerender(
      <VideoPhasePanel
        project={{
          ...baseProject,
          currentVideoBatch: {
            ...baseProject.currentVideoBatch,
            approvedShotCount: 1,
          },
        }}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "生成成片" })).toBeEnabled();
    });
    expect(screen.getByTestId("final-cut-player")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "下载 MP4" })).toHaveAttribute(
      "href",
      expect.stringContaining("final-cut/current.mp4"),
    );
  });
});
