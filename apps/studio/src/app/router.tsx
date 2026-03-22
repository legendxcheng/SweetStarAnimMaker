import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./layout";
import { ProjectsPage } from "../pages/projects-page";
import { NewProjectPage } from "../pages/new-project-page";
import { MasterPlotReviewPage } from "../pages/master-plot-review-page";
import { ProjectDetailPage } from "../pages/project-detail-page";
import { ReviewWorkspacePage } from "../pages/review-workspace-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ProjectsPage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "projects/new",
        element: <NewProjectPage />,
      },
      {
        path: "projects/:projectId",
        element: <ProjectDetailPage />,
      },
      {
        path: "projects/:projectId/master-plot/review",
        element: <MasterPlotReviewPage />,
      },
      {
        path: "projects/:projectId/storyboard/review",
        element: <ReviewWorkspacePage />,
      },
      {
        path: "*",
        element: <div>未找到页面</div>,
      },
    ],
  },
]);
