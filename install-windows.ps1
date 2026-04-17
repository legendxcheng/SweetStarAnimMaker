$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSCommandPath
. (Join-Path $workspaceRoot "tooling\scripts\windows-bootstrap.ps1")

$minimumSupportedNodeMajorVersion = 22
$repoPnpmVersion = "10.6.5"
$envFilePath = Join-Path $workspaceRoot ".env"
$bootstrapEnvTemplate = @"
STUDIO_ORIGIN=http://127.0.0.1:14273,http://localhost:5173
VITE_API_BASE_URL=http://localhost:13000
REDIS_URL=redis://127.0.0.1:6379
VECTORENGINE_BASE_URL=https://api.vectorengine.ai
STORYBOARD_LLM_MODEL=gemini-3.1-pro-preview
"@

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Elevated {
  if (Test-IsAdministrator) {
    return
  }

  Write-Host "Requesting administrator privileges..."
  $argumentList = @(
    "-NoProfile"
    "-ExecutionPolicy"
    "Bypass"
    "-File"
    "`"$PSCommandPath`""
  )

  $elevatedProcess = Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $argumentList -Wait -PassThru
  exit $elevatedProcess.ExitCode
}

function Update-SessionPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = @($machinePath, $userPath) -join ";"
}

function Get-InstalledNodeVersion {
  $command = Get-Command node -ErrorAction SilentlyContinue

  if (-not $command) {
    return $null
  }

  $nodeVersionOutput = & $command.Source --version
  if ($LASTEXITCODE -ne 0) {
    return $null
  }

  return [Version]($nodeVersionOutput.TrimStart("v"))
}

function Install-NodeLts {
  $nodeIndexUrl = "https://nodejs.org/dist/index.json"
  $tempDirectory = Join-Path $env:TEMP "sweetstar-bootstrap"
  $null = New-Item -ItemType Directory -Force -Path $tempDirectory

  Write-Host "Fetching Node.js release index from $nodeIndexUrl"
  $nodeReleases = @(Invoke-RestMethod -Uri $nodeIndexUrl)
  $nodeRelease = Select-NodeLtsRelease -Releases $nodeReleases

  if (-not $nodeRelease) {
    throw "Could not find an official Windows x64 Node.js LTS MSI."
  }

  $msiName = "node-$($nodeRelease.version)-x64.msi"
  $msiUrl = "https://nodejs.org/dist/$($nodeRelease.version)/$msiName"
  $msiPath = Join-Path $tempDirectory $msiName

  Write-Host "Downloading Node.js MSI"
  Write-Host "MSI URL: $msiUrl"
  Download-FileWithFallback -Url $msiUrl -OutputPath $msiPath

  Write-Host "Installing Node.js $($nodeRelease.version)"
  $installProcess = Start-Process -FilePath "msiexec.exe" -ArgumentList @(
    "/i"
    "`"$msiPath`""
    "/qn"
    "/norestart"
  ) -Wait -PassThru

  if ($installProcess.ExitCode -ne 0) {
    throw "Node.js installer exited with code $($installProcess.ExitCode)."
  }

  Update-SessionPath
}

function Download-FileWithFallback {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
  )

  try {
    Invoke-WebRequest -Uri $Url -OutFile $OutputPath
    return
  } catch {
    Write-Warning "Failed to download Node.js MSI with Invoke-WebRequest: $($_.Exception.Message)"
  }

  $curlCommand = Get-Command curl.exe -ErrorAction SilentlyContinue
  if (-not $curlCommand) {
    throw "Invoke-WebRequest failed and curl.exe is not available."
  }

  Write-Host "Retrying download with curl.exe"
  & $curlCommand.Source "-L" "--fail" "--output" $OutputPath $Url
  if ($LASTEXITCODE -ne 0) {
    throw "curl.exe failed to download $Url."
  }
}

function Ensure-Node {
  $installedNodeVersion = Get-InstalledNodeVersion

  if ($installedNodeVersion -and $installedNodeVersion.Major -ge $minimumSupportedNodeMajorVersion) {
    Write-Host "Node.js $installedNodeVersion already installed."
    return
  }

  if ($installedNodeVersion) {
    Write-Host "Node.js $installedNodeVersion is too old. Installing current Node.js LTS..."
  } else {
    Write-Host "Node.js not found. Installing current Node.js LTS..."
  }

  Install-NodeLts

  $verifiedNodeVersion = Get-InstalledNodeVersion
  if (-not $verifiedNodeVersion) {
    throw "Node.js installation completed, but 'node' is still unavailable in PATH."
  }

  Write-Host "Node.js $verifiedNodeVersion installed."
}

function Ensure-CorepackAndPnpm {
  Write-Host "Enabling Corepack"
  & corepack enable
  if ($LASTEXITCODE -ne 0) {
    throw "corepack enable failed."
  }

  Write-Host "Preparing pnpm@$repoPnpmVersion"
  & corepack prepare "pnpm@$repoPnpmVersion" --activate
  if ($LASTEXITCODE -ne 0) {
    throw "corepack prepare pnpm@$repoPnpmVersion --activate failed."
  }
}

function Ensure-EnvFile {
  if (Test-Path $envFilePath) {
    Write-Host ".env already exists. Leaving it unchanged."
    return
  }

  Write-Host "Creating default .env for local startup"
  Set-Content -Path $envFilePath -Value $bootstrapEnvTemplate -NoNewline
}

function Install-WorkspaceDependencies {
  Write-Host "Installing workspace dependencies with pnpm"
  Push-Location $workspaceRoot
  try {
    & corepack pnpm install
    if ($LASTEXITCODE -ne 0) {
      throw "corepack pnpm install failed."
    }
  } finally {
    Pop-Location
  }
}

Ensure-Elevated
Ensure-Node
Ensure-CorepackAndPnpm
Ensure-EnvFile
Install-WorkspaceDependencies

Write-Host ""
Write-Host "Installation complete."
Write-Host "Next step: double-click run-sweetstar.bat"
