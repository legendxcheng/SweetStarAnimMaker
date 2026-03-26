const MAX_BODY_LENGTH = 300;

export function buildProviderRequestError(
  providerLabel: string,
  status: number,
  bodyText: string | null,
) {
  const details = extractErrorDetails(bodyText);
  const segments = [`${providerLabel} provider request failed with status ${status}`];

  if (details.code) {
    segments.push(`code=${details.code}`);
  }

  if (details.message) {
    segments.push(`message=${details.message}`);
  } else if (details.body) {
    segments.push(`body=${details.body}`);
  }

  return new Error(segments.join("; "));
}

function extractErrorDetails(bodyText: string | null) {
  const trimmed = bodyText?.trim();

  if (!trimmed) {
    return {
      code: null,
      message: null,
      body: null,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const candidates = collectCandidateObjects(parsed);

    for (const candidate of candidates) {
      const code = readString(candidate.code) ?? readString(candidate.status);
      const message =
        readString(candidate.message) ??
        readString(candidate.error_description) ??
        readString(candidate.detail);

      if (code || message) {
        return {
          code,
          message,
          body: null,
        };
      }
    }
  } catch {
    // Fall back to a truncated body excerpt below.
  }

  return {
    code: null,
    message: null,
    body: truncateBody(trimmed),
  };
}

function collectCandidateObjects(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const root = value as Record<string, unknown>;
  const candidates: Array<Record<string, unknown>> = [root];
  const directError = asRecord(root.error);
  const directErrors = Array.isArray(root.errors)
    ? root.errors
        .map(asRecord)
        .filter((entry): entry is Record<string, unknown> => entry !== null)
    : [];

  if (directError) {
    candidates.push(directError);
  }

  candidates.push(...directErrors);

  return candidates;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function truncateBody(value: string) {
  const collapsed = value.replace(/\s+/g, " ").trim();

  if (collapsed.length <= MAX_BODY_LENGTH) {
    return collapsed;
  }

  return `${collapsed.slice(0, MAX_BODY_LENGTH)}...`;
}
