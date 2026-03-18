import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Layout } from "../../src/app/layout";

describe("App Shell", () => {
  it("renders the shared layout", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Layout />,
          children: [
            {
              path: "projects",
              element: <div>Projects Page</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/projects"],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("Sweet Star Studio")).toBeInTheDocument();
    expect(screen.getByText("Projects Page")).toBeInTheDocument();
  });

  it("renders the /projects route", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Layout />,
          children: [
            {
              path: "projects",
              element: <div>Projects Page</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/projects"],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("Projects Page")).toBeInTheDocument();
  });

  it("shows not-found state for unknown routes", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Layout />,
          children: [
            {
              path: "projects",
              element: <div>Projects Page</div>,
            },
            {
              path: "*",
              element: <div>Not Found</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/unknown-route"],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });
});
