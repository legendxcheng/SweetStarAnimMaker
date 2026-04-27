import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function determineWorkerMode(env = process.env) {
  const explicitMode = env.SWEETSTAR_WORKER_MODE?.trim().toLowerCase();

  if (explicitMode === "real" || explicitMode === "smoke") {
    return explicitMode;
  }

  if (explicitMode) {
    throw new Error(
      `Unsupported SWEETSTAR_WORKER_MODE: ${env.SWEETSTAR_WORKER_MODE}`,
    );
  }

  return env.VECTORENGINE_API_TOKEN?.trim() ? "real" : "smoke";
}

export async function resolveRootRedisUrl({
  workspaceRoot,
  env = process.env,
  waitForRedisUrl = defaultWaitForRedisUrl,
}) {
  const runtimeDir = env.SWEETSTAR_RUNTIME_DIR?.trim() || path.join(workspaceRoot, ".codex-runtime");
  const redisUrlFile = path.join(runtimeDir, "redis-url.txt");

  try {
    return await waitForRedisUrl(redisUrlFile);
  } catch (error) {
    const envRedisUrl = env.REDIS_URL?.trim();

    if (envRedisUrl) {
      return envRedisUrl;
    }

    throw error;
  }
}

export async function defaultWaitForRedisUrl(filePath) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8").trim();
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Redis URL file: ${filePath}`);
}

export function getPortConflicts({
  requiredPorts,
  listeningProcesses,
}) {
  const requiredPortSet = new Set(requiredPorts);
  return listeningProcesses.filter((processInfo) =>
    requiredPortSet.has(processInfo.localPort),
  );
}

export function formatPortConflictsMessage({
  contextLabel,
  conflicts,
}) {
  const lines = [
    `Cannot start ${contextLabel} because required ports are already in use:`,
    ...conflicts.map((conflict) => {
      const processName = conflict.name || "unknown-process";
      const commandLine = conflict.commandLine || "(command line unavailable)";
      return `- 127.0.0.1:${conflict.localPort} -> PID ${conflict.processId} (${processName}), command: ${commandLine}`;
    }),
    "Free those ports and retry. stop-all.bat only stops the local smoke processes.",
  ];
  return lines.join("\n");
}

export async function ensureRequiredPortsAvailable({
  requiredPorts,
  contextLabel,
  listListeningProcesses = listWindowsListeningProcesses,
}) {
  const conflicts = getPortConflicts({
    requiredPorts,
    listeningProcesses: await listListeningProcesses(),
  });

  if (conflicts.length > 0) {
    throw new Error(formatPortConflictsMessage({
      contextLabel,
      conflicts,
    }));
  }
}

export async function listWindowsListeningProcesses() {
  const query = buildListWindowsListeningProcessesQuery();

  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-Command", query],
    { windowsHide: true },
  );

  return normalizeRows(JSON.parse(stdout || "[]")).map((row) => ({
    localPort: Number(row.LocalPort),
    processId: Number(row.ProcessId),
    name: row.Name ?? "",
    commandLine: row.CommandLine ?? "",
  }));
}

export function buildListWindowsListeningProcessesQuery() {
  return `
$connections = Get-NetTCPConnection -State Listen -LocalAddress 127.0.0.1 -ErrorAction SilentlyContinue
$processes = Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine
$connections | ForEach-Object {
  $connection = $_
  $process = $processes | Where-Object { $_.ProcessId -eq $connection.OwningProcess } | Select-Object -First 1
  [pscustomobject]@{
    LocalPort = [int]$connection.LocalPort
    ProcessId = [int]$connection.OwningProcess
    Name = if ($process) { $process.Name } else { $null }
    CommandLine = if ($process) { $process.CommandLine } else { $null }
  }
} | ConvertTo-Json -Compress
`.trim();
}

function normalizeRows(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [value];
}
