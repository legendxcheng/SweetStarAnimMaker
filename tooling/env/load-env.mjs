import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadRootEnv(options = {}) {
  const envFilePath = options.envFilePath ?? path.join(workspaceRoot, ".env");

  if (!fs.existsSync(envFilePath)) {
    return {
      appliedKeys: [],
      envFilePath,
      loaded: false,
    };
  }

  const appliedKeys = [];
  const fileContents = fs.readFileSync(envFilePath, "utf8");

  for (const line of fileContents.split(/\r?\n/u)) {
    const entry = parseEnvLine(line);

    if (!entry) {
      continue;
    }

    if (process.env[entry.name] !== undefined) {
      continue;
    }

    process.env[entry.name] = entry.value;
    appliedKeys.push(entry.name);
  }

  return {
    appliedKeys,
    envFilePath,
    loaded: true,
  };
}

function parseEnvLine(line) {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const equalsIndex = trimmedLine.indexOf("=");

  if (equalsIndex <= 0) {
    return null;
  }

  const rawName = trimmedLine.slice(0, equalsIndex).trim().replace(/^export\s+/u, "");
  const rawValue = trimmedLine.slice(equalsIndex + 1).trim();

  if (!rawName) {
    return null;
  }

  return {
    name: rawName,
    value: stripWrappingQuotes(rawValue),
  };
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}