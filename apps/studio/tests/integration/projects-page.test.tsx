import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectsPage } from "../../src/pages/projects-page";
import * as apiClient from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

describe("Projects Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays loading state initially", () => {
    vi.spyOn(apiClient.apiClient, "get").mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays project list when loaded", async () => {
    vi.spyOn(apiClient.apiClient, "get").mockResolvedValue({
      projects: [
        {
          id: "proj-1",
          name: "Test Project",
          slug: "test-project",
          status: "script_ready",
          storageDir: "/path/to/project",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          currentStoryboard: null,
        },
      ],
    });

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });
  });

  it("displays empty state when no projects", async () => {
    vi.spyOn(apiClient.apiClient, "get").mockResolvedValue({
      projects: [],
    });

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });

  it("displays error state on API failure", async () => {
    vi.spyOn(apiClient.apiClient, "get").mockRejectedValue(
      new Error("Failed to fetch projects")
    );

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch projects/i)).toBeInTheDocument();
    });
  });
});
