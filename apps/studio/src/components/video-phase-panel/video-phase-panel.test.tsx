import "@testing-library/jest-dom/vitest";
import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoPhasePanel } from "../video-phase-panel";
import * as apiModule from "../../services/api-client";

vi.mock("../../services/api-client");

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
    text: "Premise text",
    visualStyleText: "Painterly rain-soaked anime market",
  },
  currentMasterPlot: null,
  currentCharacterSheetBatch: null,
  currentStoryboard: null,
  currentShotScript: null,
  currentImageBatch: {
    id: "image-batch-1",
    sourceShotScriptId: "shot-script-1",
    shotCount: 2,
    totalRequiredFrameCount: 4,
    approvedShotCount: 2,
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

const segment = {
  id: "video-segment-1",
  projectId: "proj-1",
  batchId: "video-batch-1",
  sourceImageBatchId: "image-batch-1",
  sourceShotScriptId: "shot-script-1",
  sceneId: "scene-1",
  segmentId: "segment-1",
  segmentOrder: 1,
  segmentName: "Arrival",
  segmentSummary: "Rin arrives at the flooded market.",
  shotCount: 2,
  sourceShotIds: ["shot-1", "shot-2"],
  status: "in_review" as const,
  promptTextSeed: "seed prompt",
  promptTextCurrent: "current prompt",
  promptUpdatedAt: "2024-01-01T00:00:11Z",
  referenceImages: [
    {
      id: "ref-img-1",
      assetPath:
        "videos/batches/video-batch-1/segments/scene-1__segment-1/references/images/ref-img-1.png",
      source: "auto" as const,
      order: 0,
      sourceShotId: "shot-1",
      label: "Shot 1 start",
    },
  ],
  referenceAudios: [
    {
      id: "ref-audio-1",
      assetPath:
        "videos/batches/video-batch-1/segments/scene-1__segment-1/references/audios/ref-audio-1.wav",
      source: "manual" as const,
      order: 0,
      label: "Rain guide",
      durationSec: 8,
    },
  ],
  videoAssetPath: "videos/batches/video-batch-1/segments/scene-1__segment-1/current.mp4",
  thumbnailAssetPath:
    "videos/batches/video-batch-1/segments/scene-1__segment-1/thumbnail.webp",
  durationSec: 8,
  provider: "seedance",
  model: "seedance-2",
  updatedAt: "2024-01-01T00:00:12Z",
  approvedAt: null,
  sourceTaskId: "task-video-segment-1",
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

describe("video phase panel segment workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one segment card and supports config save, generate, approve, and audio upload affordances", async () => {
    vi.spyOn(apiModule.apiClient, "listVideos").mockResolvedValue({
      currentBatch: baseProject.currentVideoBatch,
      segments: [segment],
    });
    vi.spyOn(apiModule.apiClient, "saveSegmentVideoConfig").mockResolvedValue({
      ...segment,
      promptTextCurrent: "operator edited prompt",
    });
    vi.spyOn(apiModule.apiClient, "generateVideoSegment").mockResolvedValue({
      id: "task-segment-generate-1",
      projectId: "proj-1",
      type: "segment_video_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:13Z",
      updatedAt: "2024-01-01T00:00:13Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-segment-generate-1/input.json",
        outputPath: "tasks/task-segment-generate-1/output.json",
        logPath: "tasks/task-segment-generate-1/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "approveVideoSegment").mockResolvedValue({
      ...segment,
      status: "approved",
      approvedAt: "2024-01-01T00:00:14Z",
    });

    renderPanel();

    await waitFor(() => {
      expect(apiModule.apiClient.listVideos).toHaveBeenCalledWith("proj-1");
    });

    expect(screen.getByTestId("video-segment-card-video-segment-1")).toBeInTheDocument();
    expect(screen.getByText("Arrival")).toBeInTheDocument();
    expect(screen.getByText("Rin arrives at the flooded market.")).toBeInTheDocument();
    expect(screen.getByText("Shot 1 start")).toBeInTheDocument();
    expect(screen.getByText("Rain guide")).toBeInTheDocument();
    expect(screen.getByLabelText("上传参考音频")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("current prompt"), {
      target: { value: "operator edited prompt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存当前 Segment 配置" }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveSegmentVideoConfig).toHaveBeenCalledWith(
        "proj-1",
        "video-segment-1",
        expect.objectContaining({
          promptTextCurrent: "operator edited prompt",
          referenceImages: [expect.objectContaining({ id: "ref-img-1" })],
          referenceAudios: [expect.objectContaining({ id: "ref-audio-1" })],
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "生成当前 Segment 视频" }));

    await waitFor(() => {
      expect(apiModule.apiClient.generateVideoSegment).toHaveBeenCalledWith(
        "proj-1",
        "video-segment-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "审核通过当前 Segment" }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveVideoSegment).toHaveBeenCalledWith(
        "proj-1",
        "video-segment-1",
      );
    });
  });
});
