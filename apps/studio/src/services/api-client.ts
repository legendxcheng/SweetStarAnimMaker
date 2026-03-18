import { config } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || response.statusText,
      response.status,
      response.statusText
    );
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // Review workspace
  getReviewWorkspace: (projectId: string) =>
    request<unknown>(`/projects/${projectId}/storyboard/review`),

  // Review actions
  saveHumanVersion: (projectId: string, data: unknown) =>
    request<unknown>(`/projects/${projectId}/storyboard/save-human-version`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  approveStoryboard: (projectId: string, data: unknown) =>
    request<unknown>(`/projects/${projectId}/storyboard/approve`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  rejectStoryboard: (projectId: string, data: unknown) =>
    request<unknown>(`/projects/${projectId}/storyboard/reject`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
