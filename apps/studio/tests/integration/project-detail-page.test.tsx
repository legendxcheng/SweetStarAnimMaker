import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectDetailPage } from "../../src/pages/project-detail-page";
import * as apiClient from "../../src/services/api-client";

vi.mock("../../src/services/api-client");

describe("Project Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays loading state initially", () => {
    vi.spyOn(apiClient.apiClient, "get").mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <MemoryRouter initialEntries={["/projects/proj-1"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays project details when loaded", async () => {
    vi.spyOn(apiClient.apiClient, "get").mockResolvedValue({
      id: "proj-1",
      name: "Test Project",
      slug: "test-project",
      status: "script_ready",
      storageDir: "/path/to/project",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      currentStoryboard: null,
    });

    render(
      <MemoryRouter initialEntries={["/projects/proj-1"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });
  });

  it("displays error state on API failure", async () => {
    vi.spyOn(apiClient.apiClient, "get").mockRejectedValue(
      new Error("Project not found")
    );

    render(
      <MemoryRouter initialEntries={["/projects/proj-1"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    });
  });
});
