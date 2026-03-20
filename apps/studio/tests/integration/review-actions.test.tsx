import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReviewWorkspacePage } from "../../src/pages/review-workspace-page";
import * as apiModule from "../../src/services/api-client";

const navigate = vi.fn();

vi.mock("../../src/services/api-client");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1/review"]}>
      <Routes>
        <Route path="/projects/:projectId/review" element={<ReviewWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("Review Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.alert = vi.fn();
    globalThis.confirm = vi.fn(() => true);
    vi.spyOn(apiModule.apiClient, "getReviewWorkspace").mockResolvedValue(workspace);
  });

  it("disables action buttons while approve is in flight", async () => {
    const deferred = createDeferred({
      id: "review-1",
      projectId: "proj-1",
      masterPlotId: "mp-1",
      action: "approve" as const,
      reason: null,
      triggeredTaskId: null,
      createdAt: "2024-01-01T00:00:01Z",
    });
    vi.spyOn(apiModule.apiClient, "approveMasterPlot").mockReturnValue(deferred.promise);

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "通过" });
    const rejectButton = screen.getByRole("button", { name: "驳回" });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(apiModule.apiClient.approveMasterPlot).toHaveBeenCalledWith("proj-1", {});
    });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();

    deferred.resolve({
      id: "review-1",
      projectId: "proj-1",
      masterPlotId: "mp-1",
      action: "approve",
      reason: null,
      triggeredTaskId: null,
      createdAt: "2024-01-01T00:00:01Z",
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
    });
  });

  it("rejects with a reason and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "rejectMasterPlot").mockResolvedValue({
      id: "review-2",
      projectId: "proj-1",
      masterPlotId: "mp-1",
      action: "reject",
      reason: "Need stronger framing",
      triggeredTaskId: "task-2",
      createdAt: "2024-01-01T00:00:02Z",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));
    fireEvent.change(screen.getByPlaceholderText(/请说明驳回原因/), {
      target: { value: "Need stronger framing" },
    });
    fireEvent.click(screen.getByRole("button", { name: /提交驳回/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectMasterPlot).toHaveBeenCalledWith("proj-1", {
        reason: "Need stronger framing",
      });
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("reject validation keeps the dialog open when reason is blank", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));
    fireEvent.change(screen.getByPlaceholderText(/请说明驳回原因/), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: /提交驳回/i }));

    expect(globalThis.alert).toHaveBeenCalledWith("请填写驳回原因");
    expect(apiModule.apiClient.rejectMasterPlot).not.toHaveBeenCalled();
  });
});
