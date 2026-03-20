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
              element: <div>项目页面</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/projects"],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("甜星工坊")).toBeInTheDocument();
    expect(screen.getByText("项目页面")).toBeInTheDocument();
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
              element: <div>项目页面</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/projects"],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("项目页面")).toBeInTheDocument();
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
              element: <div>未找到页面</div>,
            },
          ],
        },
      ],
      {
        initialEntries: ["/unknown-route"],
      }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("未找到页面")).toBeInTheDocument();
  });
});
