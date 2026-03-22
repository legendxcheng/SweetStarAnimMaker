import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    fireEvent.click(screen.getByRole("button", { name: /Rin/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.getCharacterSheet).toHaveBeenCalledWith("proj-1", "char-rin");
    });
    expect(screen.getByDisplayValue("silver pilot jacket")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /Rin/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /重新生成/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.regenerateCharacterSheet).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /通过当前角色/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.approveCharacterSheet).toHaveBeenCalledWith(
        "proj-1",
        "char-rin",
      );
    });
    expect(refreshProject).toHaveBeenCalled();
  });
});
