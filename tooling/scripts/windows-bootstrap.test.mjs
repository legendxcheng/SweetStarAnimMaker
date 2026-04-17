import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
  bootstrapEnvTemplate,
  minimumSupportedNodeMajorVersion,
  repoPnpmVersion,
} from "./windows-bootstrap-config.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

test("bootstrap env template contains the local-safe defaults", () => {
  assert.match(
    bootstrapEnvTemplate,
    /^STUDIO_ORIGIN=http:\/\/127\.0\.0\.1:14273,http:\/\/localhost:5173/m,
  );
  assert.match(
    bootstrapEnvTemplate,
    /^VITE_API_BASE_URL=http:\/\/localhost:13000/m,
  );
  assert.match(
    bootstrapEnvTemplate,
    /^REDIS_URL=redis:\/\/127\.0\.0\.1:6379/m,
  );
  assert.match(
    bootstrapEnvTemplate,
    /^VECTORENGINE_BASE_URL=https:\/\/api\.vectorengine\.ai/m,
  );
  assert.match(
    bootstrapEnvTemplate,
    /^STORYBOARD_LLM_MODEL=gemini-3\.1-pro-preview/m,
  );
  assert.doesNotMatch(bootstrapEnvTemplate, /^VECTORENGINE_API_TOKEN=/m);
});

test("bootstrap config tracks repository package-manager expectations", () => {
  assert.equal(minimumSupportedNodeMajorVersion, 22);
  assert.equal(repoPnpmVersion, "10.6.5");
});

test("install launcher batch file invokes the powershell installer", () => {
  const contents = fs.readFileSync(
    path.join(workspaceRoot, "install-windows.bat"),
    "utf8",
  );

  assert.match(contents, /install-windows\.ps1/);
  assert.match(contents, /ExecutionPolicy Bypass/);
});

test("installer script logs the MSI URL and falls back to curl when Invoke-WebRequest fails", () => {
  const contents = fs.readFileSync(
    path.join(workspaceRoot, "install-windows.ps1"),
    "utf8",
  );

  assert.match(contents, /Write-Host "MSI URL: \$msiUrl"/);
  assert.match(contents, /Invoke-WebRequest -Uri \$Url -OutFile \$OutputPath/);
  assert.match(contents, /curl\.exe/);
  assert.match(contents, /Failed to download Node\.js MSI with Invoke-WebRequest/);
});

test("powershell release selector skips non-LTS entries where lts is the string false", () => {
  const scriptPath = path.join(workspaceRoot, "tooling", "scripts", "windows-bootstrap.ps1");
  const command = [
    ".",
    `'${scriptPath.replace(/'/g, "''")}'`,
    ";",
    "$releases = @(",
    "[pscustomobject]@{ version = 'v25.9.0'; lts = 'false'; files = @('win-x64-msi') },",
    "[pscustomobject]@{ version = 'v24.14.1'; lts = 'Krypton'; files = @('win-x64-msi') }",
    ");",
    "$selected = Select-NodeLtsRelease -Releases $releases;",
    "if ($null -eq $selected) { throw 'No release selected' }",
    "Write-Output $selected.version",
  ].join(" ");

  const stdout = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", command],
    { encoding: "utf8" },
  );

  assert.equal(stdout.trim(), "v24.14.1");
});
