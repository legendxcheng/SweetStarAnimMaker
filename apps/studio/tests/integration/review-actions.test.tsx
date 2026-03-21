import { beforeEach, describe, expect, it, vi } from "vitest";
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
  projectName: "Test Project",
  projectStatus: "storyboard_in_review" as const,
  currentStoryboard: {
    id: "storyboard-1",
    title: "The Last Sky Choir",
    episodeTitle: "Episode 1",
    sourceMasterPlotId: "mp-1",
    sourceTaskId: "task-1",
    updatedAt: "2024-01-01T00:00:00Z",
    approvedAt: null,
    scenes: [
      {
        id: "scene-1",
        order: 1,
        name: "Opening",
        dramaticPurpose: "Introduce Rin and the comet.",
        segments: [
          {
            id: "segment-1",
            order: 1,
            durationSec: 6,
            visual: "Rain shakes across the cockpit glass.",
            characterAction: "Rin looks up.",
            dialogue: "",
            voiceOver: "That sound again.",
            audio: "A comet hum under thunder.",
            purpose: "Start the mystery.",
          },
        ],
      },
    ],
  },
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
    vi.spyOn(apiModule.apiClient, "getStoryboardReviewWorkspace").mockResolvedValue(workspace);
  });

  it("disables action buttons while approve is in flight", async () => {
    const deferred = createDeferred({
      ...workspace.currentStoryboard,
      approvedAt: "2024-01-01T00:00:01Z",
      updatedAt: "2024-01-01T00:00:01Z",
    });
    vi.spyOn(apiModule.apiClient, "approveStoryboard").mockReturnValue(deferred.promise);

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "通过" });
    const rejectButton = screen.getByRole("button", { name: "驳回" });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(apiModule.apiClient.approveStoryboard).toHaveBeenCalledWith("proj-1", {});
    });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();

    deferred.resolve({
      ...workspace.currentStoryboard,
      approvedAt: "2024-01-01T00:00:01Z",
      updatedAt: "2024-01-01T00:00:01Z",
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
    });
  });

  it("rejects and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "rejectStoryboard").mockResolvedValue({
      id: "task-2",
      projectId: "proj-1",
      type: "storyboard_generate",
      status: "pending",
      createdAt: "2024-01-01T00:00:02Z",
      updatedAt: "2024-01-01T00:00:02Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task-2/input.json",
        outputPath: "tasks/task-2/output.json",
        logPath: "tasks/task-2/log.txt",
      },
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectStoryboard).toHaveBeenCalledWith("proj-1", {});
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });

  it("does not reject when the user cancels confirmation", async () => {
    globalThis.confirm = vi.fn(() => false);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "驳回" }));

    expect(apiModule.apiClient.rejectStoryboard).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
