import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./layout";
import { ProjectsPage } from "../pages/projects-page";
import { NewProjectPage } from "../pages/new-project-page";

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
        path: "*",
        element: <div>Not Found</div>,
      },
    ],
  },
]);
