import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewProjectPage } from "../../src/pages/new-project-page";
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

describe("New Project Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits name and premise, then navigates to the created project", async () => {
    vi.spyOn(apiModule.apiClient, "createProject").mockResolvedValue({
      id: "proj-1",
      name: "Test Project",
      slug: "test-project",
      status: "premise_ready",
      storageDir: "/path/to/project",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      currentMasterPlot: null,
      premise: {
        path: "premise/v1.md",
        bytes: 42,
        updatedAt: "2024-01-01T00:00:00Z",
      },
    });

    render(<NewProjectPage />);

    fireEvent.change(screen.getByLabelText("Project Name"), {
      target: { value: "Test Project" },
    });
    fireEvent.change(screen.getByLabelText("Premise"), {
      target: {
        value: "A washed-up pilot discovers a singing comet above a drowned city.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() => {
      expect(apiModule.apiClient.createProject).toHaveBeenCalledWith({
        name: "Test Project",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      });
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });
});
