import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectsPage } from "../../src/pages/projects-page";
import * as apiModule from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

describe("Projects Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays loading state initially", () => {
    vi.spyOn(apiModule.apiClient, "listProjects").mockImplementation(
      () => new Promise(() => {}),
    );

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays project list when loaded", async () => {
    vi.spyOn(apiModule.apiClient, "listProjects").mockResolvedValue([
      {
        id: "proj-1",
        name: "Test Project",
        slug: "test-project",
        status: "premise_ready",
        storageDir: "/path/to/project",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        currentMasterPlot: null,
      },
    ]);

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });
  });

  it("displays empty state when no projects", async () => {
    vi.spyOn(apiModule.apiClient, "listProjects").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });

  it("displays error state on API failure", async () => {
    vi.spyOn(apiModule.apiClient, "listProjects").mockRejectedValue(
      new Error("Failed to fetch projects"),
    );

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch projects/i)).toBeInTheDocument();
    });
  });
});
