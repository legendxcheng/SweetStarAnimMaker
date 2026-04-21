import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CharacterSheetsPhasePanel } from "../../src/components/character-sheets-phase-panel";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const baseProject = {
  id: "proj-1",
  name: "Test Project",
  slug: "test-project",
  status: "character_sheets_in_review" as const,
  storageDir: "/path/to/project",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  premise: {
    path: "premise/v1.md",
    bytes: 42,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  currentMasterPlot: {
    id: "mp-1",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis: "Rin follows the comet song and discovers how to lift the drowned city.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict: "Rin must choose between escape and saving the city.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "The city rises on a final chorus of light.",
    targetDurationSec: 480,
    sourceTaskId: "task-master-plot",
    updatedAt: "2024-01-01T00:00:03Z",
    approvedAt: "2024-01-01T00:00:04Z",
  },
  currentCharacterSheetBatch: {
    id: "char-batch-1",
    sourceMasterPlotId: "mp-1",
    characterCount: 2,
    approvedCharacterCount: 1,
    updatedAt: "2024-01-01T00:00:05Z",
  },
  currentStoryboard: null,
};

const rinCharacter = {
  id: "char-rin",
  projectId: "proj-1",
  batchId: "char-batch-1",
  sourceMasterPlotId: "mp-1",
  characterName: "Rin",
  promptTextGenerated: "silver pilot jacket",
  promptTextCurrent: "silver pilot jacket",
  referenceImages: [],
  imageAssetPath: "character-sheets/char-rin/current.png",
  imageWidth: 1536,
  imageHeight: 1024,
  provider: "turnaround-image",
  model: "imagen-4.0-generate-preview",
  status: "in_review" as const,
  updatedAt: "2024-01-01T00:00:05Z",
  approvedAt: null,
  sourceTaskId: "task-char-rin",
};

const generatingProject = {
  ...baseProject,
  status: "character_sheets_generating" as const,
};

const generatingTask = {
  id: "task-char-batch-1",
  projectId: "proj-1",
  type: "character_sheets_generate" as const,
  status: "running" as const,
  createdAt: "2024-01-01T00:00:06Z",
  updatedAt: "2024-01-01T00:00:07Z",
  startedAt: "2024-01-01T00:00:07Z",
  finishedAt: null,
  errorMessage: null,
  files: {
    inputPath: "tasks/task-char-batch-1/input.json",
    outputPath: "tasks/task-char-batch-1/output.json",
    logPath: "tasks/task-char-batch-1/log.txt",
  },
};

function renderPanel() {
  return render(
    <CharacterSheetsPhasePanel
      project={baseProject}
      task={null}
      taskError={null}
      creatingTask={false}
      disableGenerate={false}
      onGenerate={vi.fn()}
      onProjectRefresh={vi.fn()}
    />,
  );
}

describe("CharacterSheetsPhasePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes decomposed support modules for the panel split", async () => {
    const [
      constantsModule,
      utilsModule,
      batchSummaryModule,
      taskStatusModule,
      listCardModule,
      detailCardModule,
      imagePreviewModule,
    ] = await Promise.all([
      import("../../src/components/character-sheets-phase-panel/constants"),
      import("../../src/components/character-sheets-phase-panel/utils"),
      import("../../src/components/character-sheets-phase-panel/batch-summary-card"),
      import("../../src/components/character-sheets-phase-panel/task-status-card"),
      import("../../src/components/character-sheets-phase-panel/character-list-card"),
      import("../../src/components/character-sheets-phase-panel/character-detail-card"),
      import("../../src/components/character-sheets-phase-panel/image-preview-modal"),
    ]);

    expect(constantsModule.TASK_STATUS_LABELS.pending).toBe("排队中");
    expect(constantsModule.CHARACTER_STATUS_LABELS.in_review).toBe("待审核");
    expect(typeof utilsModule.normalizeCharacter).toBe("function");
    expect(batchSummaryModule.CharacterSheetBatchSummaryCard).toBeTypeOf("function");
    expect(taskStatusModule.CharacterSheetTaskStatusCard).toBeTypeOf("function");
    expect(listCardModule.CharacterSheetListCard).toBeTypeOf("function");
    expect(detailCardModule.CharacterSheetDetailCard).toBeTypeOf("function");
    expect(imagePreviewModule.CharacterSheetImagePreviewModal).toBeTypeOf("function");
  });

  it("loads character cards and lets the user open a character detail", async () => {
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: baseProject.currentCharacterSheetBatch,
      characters: [
        rinCharacter,
        {
          ...rinCharacter,
          id: "char-ivo",
          characterName: "Ivo",
          status: "approved",
          approvedAt: "2024-01-01T00:00:06Z",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(rinCharacter);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText("Rin")).toBeInTheDocument();
      expect(screen.getByText("Ivo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Rin 待审核$/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.getCharacterSheet).toHaveBeenCalledWith("proj-1", "char-rin");
    });
    expect(screen.getByDisplayValue("silver pilot jacket")).toBeInTheDocument();
  });

  it("renders color-coded status tags in the character list", async () => {
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: baseProject.currentCharacterSheetBatch,
      characters: [
        {
          ...rinCharacter,
          id: "char-generating",
          characterName: "Gen",
          status: "generating" as const,
        },
        {
          ...rinCharacter,
          id: "char-review",
          characterName: "Review",
          status: "in_review" as const,
        },
        {
          ...rinCharacter,
          id: "char-approved",
          characterName: "Approved",
          status: "approved" as const,
          approvedAt: "2024-01-01T00:00:06Z",
        },
        {
          ...rinCharacter,
          id: "char-failed",
          characterName: "Failed",
          status: "failed" as const,
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(rinCharacter);

    renderPanel();

    const listCard = (await screen.findByText("角色列表")).closest("div");
    expect(listCard).not.toBeNull();

    const listScope = within(listCard!);
    const generatingTag = listScope.getByText("生成中");
    const reviewTag = listScope.getByText("待审核");
    const approvedTag = listScope.getByText("已通过");
    const failedTag = listScope.getByText("失败");

    expect(generatingTag).toHaveClass("bg-(--color-accent)/15", "text-(--color-accent)");
    expect(reviewTag).toHaveClass("bg-(--color-warning)/15", "text-(--color-warning)");
    expect(approvedTag).toHaveClass("bg-(--color-success)/15", "text-(--color-success)");
    expect(failedTag).toHaveClass("bg-(--color-danger)/15", "text-(--color-danger)");
  });

  it("renders the current character image preview and opens a larger viewer", async () => {
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: baseProject.currentCharacterSheetBatch,
      characters: [rinCharacter],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(rinCharacter);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText("Rin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Rin 待审核$/i }));

    const previewImage = await screen.findByAltText("Rin 当前立绘");
    expect(previewImage).toBeInTheDocument();
    expect(previewImage).toHaveClass("object-contain");

    fireEvent.click(screen.getByRole("button", { name: "查看大图" }));

    expect(await screen.findByRole("dialog", { name: "Rin 当前立绘预览" })).toBeInTheDocument();
    expect(screen.getByAltText("Rin 当前立绘大图")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭大图预览" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Rin 当前立绘预览" })).not.toBeInTheDocument();
    });
  });

  it("renders existing reference-image thumbnails, uploads files, and deletes one reference image", async () => {
    const characterWithReferenceImage = {
      ...rinCharacter,
      referenceImages: [
        {
          id: "ref_001",
          fileName: "ref-001.png",
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 1234,
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    };
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: baseProject.currentCharacterSheetBatch,
      characters: [characterWithReferenceImage],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(characterWithReferenceImage);
    vi.spyOn(apiModule.apiClient, "uploadCharacterReferenceImages").mockResolvedValue({
      ...characterWithReferenceImage,
      referenceImages: [
        ...characterWithReferenceImage.referenceImages,
        {
          id: "ref_002",
          fileName: "ref-002.jpg",
          originalFileName: "rin-pose.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 2345,
          createdAt: "2026-03-22T12:01:00.000Z",
        },
      ],
    });
    vi.spyOn(apiModule.apiClient, "deleteCharacterReferenceImage").mockResolvedValue({
      ...characterWithReferenceImage,
      referenceImages: [],
    });

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText("Rin")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^Rin 待审核$/i }));

    expect(await screen.findByText("参考图")).toBeInTheDocument();
    expect(screen.getByAltText("rin-face.png")).toHaveAttribute(
      "src",
      expect.stringContaining("v=ref_001%3Aref-001.png%3A1234%3A2026-03-22T12%3A00%3A00.000Z"),
    );

    const fileInput = screen.getByLabelText("添加参考图");
    const uploadFile = new File(["pose"], "rin-pose.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, {
      target: {
        files: [uploadFile],
      },
    });

    await waitFor(() => {
      expect(apiModule.apiClient.uploadCharacterReferenceImages).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
        [uploadFile],
      );
    });
    expect(await screen.findByAltText("rin-pose.jpg")).toHaveAttribute(
      "src",
      expect.stringContaining("v=ref_002%3Aref-002.jpg%3A2345%3A2026-03-22T12%3A01%3A00.000Z"),
    );

    fireEvent.click(screen.getByRole("button", { name: /删除参考图 rin-face.png/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.deleteCharacterReferenceImage).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
        "ref_001",
      );
    });
  });

  it("saves prompt edits, triggers regenerate, and approves the selected character", async () => {
    const refreshProject = vi.fn();
    vi.spyOn(apiModule.apiClient, "listCharacterSheets").mockResolvedValue({
      currentBatch: baseProject.currentCharacterSheetBatch,
      characters: [rinCharacter],
    });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet").mockResolvedValue(rinCharacter);
    vi.spyOn(apiModule.apiClient, "updateCharacterSheetPrompt").mockResolvedValue({
      ...rinCharacter,
      promptTextCurrent: "silver pilot jacket, comet visor",
    });
    vi.spyOn(apiModule.apiClient, "regenerateCharacterSheet").mockResolvedValue({
      id: "task-char-rin-regen",
      projectId: "proj-1",
      type: "character_sheet_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:07Z",
      updatedAt: "2024-01-01T00:00:07Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-char-rin-regen/input.json",
        outputPath: "tasks/task-char-rin-regen/output.json",
        logPath: "tasks/task-char-rin-regen/log.txt",
      },
    });
    vi.spyOn(apiModule.apiClient, "approveCharacterSheet").mockResolvedValue({
      ...rinCharacter,
      status: "approved",
      approvedAt: "2024-01-01T00:00:08Z",
    });

    render(
      <CharacterSheetsPhasePanel
        project={baseProject}
        task={null}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={refreshProject}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Rin")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^Rin 待审核$/i }));

    const promptInput = await screen.findByDisplayValue("silver pilot jacket");
    fireEvent.change(promptInput, {
      target: { value: "silver pilot jacket, comet visor" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存提示词/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.updateCharacterSheetPrompt).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
        {
          promptTextCurrent: "silver pilot jacket, comet visor",
        },
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: /重新生成/i })[1]!);

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateCharacterSheet).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
      );
    });
    expect(screen.queryByAltText("rin-face.png")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /通过当前角色/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveCharacterSheet).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
      );
    });
    expect(refreshProject).toHaveBeenCalled();
  });

  it("refreshes character statuses and the selected image while generation is still in progress", async () => {
    const intervalCallbacks: Array<() => void> = [];
    vi.spyOn(global, "setInterval").mockImplementation(((callback) => {
      intervalCallbacks.push(callback as () => void);
      return intervalCallbacks.length as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    vi.spyOn(global, "clearInterval").mockImplementation(() => undefined);

    vi.spyOn(apiModule.apiClient, "listCharacterSheets")
      .mockResolvedValueOnce({
        currentBatch: generatingProject.currentCharacterSheetBatch,
        characters: [
          {
            ...rinCharacter,
            status: "generating" as const,
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        currentBatch: generatingProject.currentCharacterSheetBatch,
        characters: [rinCharacter],
      });
    vi.spyOn(apiModule.apiClient, "getCharacterSheet")
      .mockResolvedValueOnce({
        ...rinCharacter,
        status: "generating" as const,
        imageAssetPath: null,
        imageWidth: null,
        imageHeight: null,
      })
      .mockResolvedValueOnce(rinCharacter);

    render(
      <CharacterSheetsPhasePanel
        project={generatingProject}
        task={generatingTask}
        taskError={null}
        creatingTask={false}
        disableGenerate={false}
        onGenerate={vi.fn()}
        onProjectRefresh={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Rin 生成中$/i })).toBeInTheDocument();
    });

    expect(screen.getByText("尚未生成当前立绘")).toBeInTheDocument();
    expect(intervalCallbacks.length).toBeGreaterThan(0);

    await act(async () => {
      intervalCallbacks[intervalCallbacks.length - 1]?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(apiModule.apiClient.listCharacterSheets).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(apiModule.apiClient.getCharacterSheet).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole("button", { name: /^Rin 待审核$/i })).toBeInTheDocument();
    expect(screen.getByAltText("Rin 当前立绘")).toBeInTheDocument();
  });
});
