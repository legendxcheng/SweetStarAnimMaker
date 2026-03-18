import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReviewWorkspacePage } from "../../src/pages/review-workspace-page";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const workspace = {
  projectId: "proj-1",
  projectStatus: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "sbv-1",
    projectId: "proj-1",
    versionNumber: 1,
    kind: "ai" as const,
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    filePath: "storyboards/versions/v1-ai.json",
    createdAt: "2024-01-01T00:00:00Z",
    sourceTaskId: "task-1",
    summary: "Initial storyboard summary",
    scenes: [
      {
        id: "scene-1",
        sceneIndex: 1,
        description: "Opening shot",
        camera: "wide shot",
        characters: ["A"],
        prompt: "wide shot prompt",
      },
    ],
  },
  latestReview: null,
  availableActions: {
    saveHumanVersion: true,
    approve: true,
    reject: true,
  },
  latestStoryboardTask: null,
};

const refreshedWorkspace = {
  ...workspace,
  currentStoryboard: {
    ...workspace.currentStoryboard,
    id: "sbv-2",
    versionNumber: 2,
    kind: "human" as const,
    provider: "manual",
    model: "manual-edit",
    summary: "Updated storyboard summary",
    scenes: [
      {
        ...workspace.currentStoryboard.scenes[0],
        description: "Updated opening shot",
      },
    ],
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1/review"]}>
      <Routes>
        <Route path="/projects/:projectId/review" element={<ReviewWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Project Review Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.alert = vi.fn();
  });

  it("loads the workspace and renders editable summary and scene fields", async () => {
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace").mockResolvedValue(workspace);

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Initial storyboard summary")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Opening shot")).toBeInTheDocument();
    expect(screen.getByDisplayValue("wide shot")).toBeInTheDocument();
    expect(screen.getByDisplayValue("wide shot prompt")).toBeInTheDocument();
  });

  it("saves the edited draft and refreshes the workspace", async () => {
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace")
      .mockResolvedValueOnce(workspace)
      .mockResolvedValueOnce(refreshedWorkspace);
    vi.spyOn(apiModule.apiClient, "saveHumanVersion").mockResolvedValue(
      refreshedWorkspace.currentStoryboard,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Initial storyboard summary")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Summary:"), {
      target: { value: "Updated storyboard summary" },
    });
    fireEvent.change(screen.getByLabelText("Description:"), {
      target: { value: "Updated opening shot" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveHumanVersion).toHaveBeenCalledWith("proj-1", {
        baseVersionId: "sbv-1",
        summary: "Updated storyboard summary",
        scenes: [
          {
            id: "scene-1",
            sceneIndex: 1,
            description: "Updated opening shot",
            camera: "wide shot",
            characters: ["A"],
            prompt: "wide shot prompt",
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Updated storyboard summary")).toBeInTheDocument();
    });
  });

  it("keeps edited draft values visible when save fails", async () => {
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace").mockResolvedValue(workspace);
    vi.spyOn(apiModule.apiClient, "saveHumanVersion").mockRejectedValue(
      new Error("Version conflict"),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Initial storyboard summary")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Summary:"), {
      target: { value: "Draft summary that should stay visible" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith("Save failed: Version conflict");
    });

    expect(
      screen.getByDisplayValue("Draft summary that should stay visible"),
    ).toBeInTheDocument();
  });
});
