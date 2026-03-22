export interface UploadWithPsda1Input {
  fileName: string;
  fileBytes: Uint8Array;
  fetchFn?: typeof fetch;
}

export async function uploadWithPsda1(input: UploadWithPsda1Input): Promise<string> {
  const fileBuffer = Buffer.from(input.fileBytes);
  const response = await (input.fetchFn ?? fetch)(
    `https://p.sda1.dev/api/v1/upload_external_noform?filename=${encodeURIComponent(input.fileName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await readErrorMessage(response)}`);
  }

  const payload = (await response.json()) as {
    data?: {
      url?: unknown;
    };
  };
  const url = payload.data?.url;

  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Response payload did not include data.url");
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
