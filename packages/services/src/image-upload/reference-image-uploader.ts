import { readFile } from "node:fs/promises";
import path from "node:path";

import { uploadWithPicgo } from "./providers/picgo-image-upload-provider";
import { uploadWithPsda1 } from "./providers/psda1-image-upload-provider";

const DEFAULT_UPLOAD_PROVIDER_ORDER = ["psda1", "picgo"] as const;

type UploadProviderName = (typeof DEFAULT_UPLOAD_PROVIDER_ORDER)[number];

export interface UploadReferenceImageInput {
  localFilePath: string;
}

export interface ReferenceImageUploader {
  uploadReferenceImage(input: UploadReferenceImageInput): Promise<string>;
}

export interface CreateReferenceImageUploaderOptions {
  providerOrder?: string[];
  picgoApiKey?: string;
  fetchFn?: typeof fetch;
}

export function createReferenceImageUploader(
  options: CreateReferenceImageUploaderOptions = {},
): ReferenceImageUploader {
  const providerOrder = normalizeProviderOrder(options.providerOrder);

  return {
    async uploadReferenceImage(input) {
      const fileBytes = await readFile(input.localFilePath);
      const fileName = path.basename(input.localFilePath);
      const errors: string[] = [];

      for (const providerName of providerOrder) {
        try {
          if (providerName === "psda1") {
            return await uploadWithPsda1({
              fileName,
              fileBytes,
              fetchFn: options.fetchFn,
            });
          }

          return await uploadWithPicgo({
            fileName,
            fileBytes,
            picgoApiKey: options.picgoApiKey,
            fetchFn: options.fetchFn,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown upload error";
          errors.push(`${providerName}: ${message}`);
        }
      }

      throw new Error(`Reference image upload failed: ${errors.join("; ")}`);
    },
  };
}

function normalizeProviderOrder(providerOrder?: string[]): UploadProviderName[] {
  const normalized = new Set<UploadProviderName>();

  for (const token of providerOrder ?? DEFAULT_UPLOAD_PROVIDER_ORDER) {
    const providerName = token.trim().toLowerCase();

    if (providerName === "psda1" || providerName === "picgo") {
      normalized.add(providerName);
    }
  }

  return normalized.size > 0 ? Array.from(normalized) : [...DEFAULT_UPLOAD_PROVIDER_ORDER];
}
