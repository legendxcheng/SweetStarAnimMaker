import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const smokeCommandPatterns = [
  "tooling\\scripts\\start-redis-memory.cjs",
  "tooling\\scripts\\start-api-root.mjs",
  "tooling\\scripts\\start-worker-smoke.mjs",
  "node_modules\\vite\\bin\\vite.js --host 127.0.0.1 --port 4273",
];

export function isSmokeProcessCommandLine(commandLine) {
  if (!commandLine || typeof commandLine !== "string") {
    return false;
  }

  const normalized = commandLine.toLowerCase();
  return smokeCommandPatterns.some((pattern) =>
    normalized.includes(pattern.toLowerCase()),
  );
}

export async function stopSmokeProcesses() {
  const query = [
    "Get-CimInstance Win32_Process",
    "| Select-Object ProcessId,CommandLine",
    "| ConvertTo-Json -Compress",
  ].join(" ");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", query], {
    windowsHide: true,
  });
  const rows = normalizeRows(JSON.parse(stdout || "[]"));
  const matching = rows.filter((row) => isSmokeProcessCommandLine(row.CommandLine));
  const stopped = [];

  for (const row of matching) {
    try {
      await execFileAsync(
        "taskkill.exe",
        ["/PID", String(row.ProcessId), "/T", "/F"],
        { windowsHide: true },
      );
      stopped.push({
        pid: row.ProcessId,
        commandLine: row.CommandLine,
      });
    } catch {
      // Ignore processes that exited between enumeration and kill.
    }
  }

  return stopped;
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

if (import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const stopped = await stopSmokeProcesses();

  if (stopped.length === 0) {
    console.log("No smoke processes found.");
  } else {
    for (const processInfo of stopped) {
      console.log(`Stopped PID ${processInfo.pid}: ${processInfo.commandLine}`);
    }
  }
}
