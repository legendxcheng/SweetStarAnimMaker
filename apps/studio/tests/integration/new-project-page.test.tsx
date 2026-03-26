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
        text: "A washed-up pilot discovers a singing comet above a drowned city.",
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
      },
    });

    render(<NewProjectPage />);

    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "Test Project" },
    });
    fireEvent.change(screen.getByLabelText("项目前提"), {
      target: {
        value: "A washed-up pilot discovers a singing comet above a drowned city.",
      },
    });
    fireEvent.change(screen.getByLabelText("画面风格描述"), {
      target: {
        value: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建项目" }));

    await waitFor(() => {
      expect(apiModule.apiClient.createProject).toHaveBeenCalledWith({
        name: "Test Project",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
      });
    });

    expect(navigate).toHaveBeenCalledWith("/projects/proj-1");
  });
});
