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
      storyboardVersionId: "sbv-1",
      action: "approve" as const,
      reason: null,
      triggeredTaskId: null,
      createdAt: "2024-01-01T00:00:01Z",
    });
    vi.spyOn(apiModule.apiClient, "approveStoryboard").mockReturnValue(deferred.promise);

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    const rejectButton = screen.getByRole("button", { name: "Reject" });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(apiModule.apiClient.approveStoryboard).toHaveBeenCalledWith("proj-1", {
        storyboardVersionId: "sbv-1",
      });
    });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();

    deferred.resolve({
      id: "review-1",
      projectId: "proj-1",
      storyboardVersionId: "sbv-1",
      action: "approve",
      reason: null,
      triggeredTaskId: null,
      createdAt: "2024-01-01T00:00:01Z",
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
    });
  });

  it("rejects with edit_manually and stays on the review page", async () => {
    vi.spyOn(apiModule.apiClient, "rejectStoryboard").mockResolvedValue({
      id: "review-2",
      projectId: "proj-1",
      storyboardVersionId: "sbv-1",
      action: "reject",
      reason: "Need stronger framing",
      triggeredTaskId: null,
      createdAt: "2024-01-01T00:00:02Z",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.change(screen.getByPlaceholderText(/explain why/i), {
      target: { value: "Need stronger framing" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit rejection/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectStoryboard).toHaveBeenCalledWith("proj-1", {
        storyboardVersionId: "sbv-1",
        reason: "Need stronger framing",
        nextAction: "edit_manually",
      });
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(apiModule.apiClient.getReviewWorkspace).toHaveBeenCalledTimes(2);
  });

  it("rejects with regenerate and redirects back to the project detail page", async () => {
    vi.spyOn(apiModule.apiClient, "rejectStoryboard").mockResolvedValue({
      id: "review-3",
      projectId: "proj-1",
      storyboardVersionId: "sbv-1",
      action: "reject",
      reason: "Try another draft",
      triggeredTaskId: "task-2",
      createdAt: "2024-01-01T00:00:03Z",
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByPlaceholderText(/explain why/i), {
      target: { value: "Try another draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit rejection/i }));

    await waitFor(() => {
      expect(apiModule.apiClient.rejectStoryboard).toHaveBeenCalledWith("proj-1", {
        storyboardVersionId: "sbv-1",
        reason: "Try another draft",
        nextAction: "regenerate",
      });
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });
});
