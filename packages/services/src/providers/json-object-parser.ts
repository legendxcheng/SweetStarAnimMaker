export function parseJsonObjectFromText(rawText: string, invalidJsonMessage: string) {
  const directPayload = tryParseJson(rawText.trim());

  if (directPayload !== null) {
    return directPayload;
  }

  const extractedObjectText = extractFirstJsonObject(rawText);

  if (extractedObjectText !== null) {
    const extractedPayload = tryParseJson(extractedObjectText);

    if (extractedPayload !== null) {
      return extractedPayload;
    }
  }

  throw new Error(invalidJsonMessage);
}

function tryParseJson(rawText: string) {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

function extractFirstJsonObject(rawText: string) {
  const startIndex = rawText.indexOf("{");

  if (startIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (char === undefined) {
      break;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return rawText.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}
