import { characterSheetsApi } from "./api-client/character-sheets";
import { finalCutApi } from "./api-client/final-cut";
import { imagesApi } from "./api-client/images";
import { masterPlotApi } from "./api-client/master-plot";
import { projectsApi } from "./api-client/projects";
import { sceneSheetsApi } from "./api-client/scene-sheets";
import { shotScriptApi } from "./api-client/shot-script";
import { storyboardApi } from "./api-client/storyboard";
import { tasksApi } from "./api-client/tasks";
import { videosApi } from "./api-client/videos";

export { ApiError } from "./api-client/shared";

export const apiClient = {
  ...projectsApi,
  ...masterPlotApi,
  ...characterSheetsApi,
  ...sceneSheetsApi,
  ...storyboardApi,
  ...shotScriptApi,
  ...imagesApi,
  ...videosApi,
  ...finalCutApi,
  ...tasksApi,
};
