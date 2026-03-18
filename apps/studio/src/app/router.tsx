import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./layout";

export const router = createBrowserRouter([
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
]);
