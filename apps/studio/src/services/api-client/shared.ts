import { config } from "../config";

export interface ResponseSchema<T> {
  parse(input: unknown): T;
}

interface RequestSchema<T> {
  parse(input: unknown): T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  schema: ResponseSchema<T>,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.apiBaseUrl}${path}`;
  const headers = new Headers(options.headers);
  const method = options.method ?? "GET";

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    method,
    cache: method === "GET" ? "no-store" : options.cache,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || response.statusText,
      response.status,
      response.statusText,
    );
  }

  return schema.parse(await response.json());
}

export function jsonBody<T>(schema: RequestSchema<T>, data: unknown): string {
  return JSON.stringify(schema.parse(data));
}

export const http = {
  del<T>(path: string, schema: ResponseSchema<T>, options: RequestInit = {}) {
    return request(path, schema, { ...options, method: "DELETE" });
  },

  get<T>(path: string, schema: ResponseSchema<T>, options: RequestInit = {}) {
    return request(path, schema, { ...options, method: "GET" });
  },

  post<T>(path: string, schema: ResponseSchema<T>, options: RequestInit = {}) {
    return request(path, schema, { ...options, method: "POST" });
  },

  put<T>(path: string, schema: ResponseSchema<T>, options: RequestInit = {}) {
    return request(path, schema, { ...options, method: "PUT" });
  },
};
