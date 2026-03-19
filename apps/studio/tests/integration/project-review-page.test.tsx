import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReviewWorkspacePage } from "../../src/pages/review-workspace-page";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

const workspace = {
  projectId: "proj-1",
  projectStatus: "master_plot_in_review" as const,
  currentMasterPlot: {
    id: "mp-1",
    title: "The Last Sky Choir",
    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
    synopsis: "Rin hears the comet sing and discovers how to lift the drowned city.",
    mainCharacters: ["Rin", "Ivo"],
    coreConflict: "Rin must choose between escape and saving the city.",
    emotionalArc: "She moves from bitterness to sacrificial hope.",
    endingBeat: "The city rises on a final chorus of light.",
    targetDurationSec: 480,
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:00Z",
    approvedAt: null,
  },
  latestReview: null,
  availableActions: {
    save: true,
    approve: true,
    reject: true,
  },
  latestTask: null,
};

const refreshedWorkspace = {
  ...workspace,
  currentMasterPlot: {
    ...workspace.currentMasterPlot,
    title: "The Last Sky Choir Revised",
    synopsis: "Updated master plot synopsis",
    updatedAt: "2024-01-01T00:00:02Z",
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

  it("loads the workspace and renders editable master-plot fields", async () => {
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace").mockResolvedValue(workspace);

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    expect(
      screen.getByDisplayValue(
        "A disgraced pilot chases a cosmic song to save her flooded home.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rin, Ivo")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("The city rises on a final chorus of light."),
    ).toBeInTheDocument();
  });

  it("saves the edited draft and refreshes the workspace", async () => {
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace")
      .mockResolvedValueOnce(workspace)
      .mockResolvedValueOnce(refreshedWorkspace);
    vi.spyOn(apiModule.apiClient, "saveMasterPlot").mockResolvedValue(
      refreshedWorkspace.currentMasterPlot,
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "The Last Sky Choir Revised" },
    });
    fireEvent.change(screen.getByLabelText("Synopsis"), {
      target: { value: "Updated master plot synopsis" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.saveMasterPlot).toHaveBeenCalledWith("proj-1", {
        title: "The Last Sky Choir Revised",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "Updated master plot synopsis",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between escape and saving the city.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "The city rises on a final chorus of light.",
        targetDurationSec: 480,
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir Revised")).toBeInTheDocument();
    });
  });

  it("keeps edited draft values visible when save fails", async () => {
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace").mockResolvedValue(workspace);
    vi.spyOn(apiModule.apiClient, "saveMasterPlot").mockRejectedValue(
      new Error("Version conflict"),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("The Last Sky Choir")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Draft title that should stay visible" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith("Save failed: Version conflict");
    });

    expect(screen.getByDisplayValue("Draft title that should stay visible")).toBeInTheDocument();
  });
});
