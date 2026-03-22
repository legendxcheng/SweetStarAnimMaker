export interface UploadWithPicgoInput {
  fileName: string;
  fileBytes: Uint8Array;
  picgoApiKey?: string;
  fetchFn?: typeof fetch;
}

export async function uploadWithPicgo(input: UploadWithPicgoInput): Promise<string> {
  const apiKey = input.picgoApiKey?.trim();

  if (!apiKey) {
    throw new Error("PICGO_API_KEY is not set");
  }

  const fileBuffer = Buffer.from(input.fileBytes);
  const formData = new FormData();
  formData.append("source", new Blob([fileBuffer]), input.fileName);

  const response = await (input.fetchFn ?? fetch)("https://www.picgo.net/api/1/upload", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await readErrorMessage(response)}`);
  }

  const payload = (await response.json()) as {
    image?: {
      url?: unknown;
      url_viewer?: unknown;
    };
    url?: unknown;
  };
  const url = payload.image?.url ?? payload.image?.url_viewer ?? payload.url;

  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Response payload did not include a usable image URL");
  }

  return url;
}

async function readErrorMessage(response: Response) {
  const payload = await response.json().catch(() => null);
  const nestedError = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  const directError = (payload as { error?: unknown } | null)?.error;
  const directMessage = (payload as { message?: unknown } | null)?.message;

  if (typeof nestedError === "string" && nestedError.trim()) {
    return nestedError;
  }

  if (typeof directError === "string" && directError.trim()) {
    return directError;
  }

  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage;
  }

  return response.statusText || "Request failed";
}
