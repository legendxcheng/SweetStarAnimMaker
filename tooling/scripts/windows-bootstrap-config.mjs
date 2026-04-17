export const minimumSupportedNodeMajorVersion = 22;
export const repoPnpmVersion = "10.6.5";

export const bootstrapEnvTemplate = [
  "STUDIO_ORIGIN=http://127.0.0.1:14273,http://localhost:5173",
  "VITE_API_BASE_URL=http://localhost:13000",
  "REDIS_URL=redis://127.0.0.1:6379",
  "VECTORENGINE_BASE_URL=https://api.vectorengine.ai",
  "STORYBOARD_LLM_MODEL=gemini-3.1-pro-preview",
].join("\n") + "\n";
