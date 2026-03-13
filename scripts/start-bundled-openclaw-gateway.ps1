param(
  [string]$ResourcesPath = "",
  [int]$Port = 18789
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-ClawFastResources([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return $false
  }

  $nodeRuntime = Join-Path $Path 'node-runtime\node.exe'
  $openClawEntry = Join-Path $Path 'openclaw\openclaw.mjs'
  return (Test-Path $nodeRuntime) -and (Test-Path $openClawEntry)
}

function Resolve-ResourcesPath([string]$RequestedPath) {
  if (Test-ClawFastResources $RequestedPath) {
    return (Resolve-Path $RequestedPath).Path
  }

  $candidates = @(
    $env:CLAWFAST_RESOURCES_PATH,
    (Join-Path $env:LOCALAPPDATA 'Programs\ClawFast\resources'),
    (Join-Path $env:ProgramFiles 'ClawFast\resources'),
    (Join-Path $PSScriptRoot '..\dist\win-unpacked\resources')
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($candidate in $candidates) {
    if (Test-ClawFastResources $candidate) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw 'Bundled ClawFast resources were not found. Pass -ResourcesPath explicitly.'
}

$resolvedResources = Resolve-ResourcesPath $ResourcesPath
$nodeRuntime = Join-Path $resolvedResources 'node-runtime\node.exe'
$openClawDir = Join-Path $resolvedResources 'openclaw'
$openClawEntry = Join-Path $openClawDir 'openclaw.mjs'

$existing = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -like '*openclaw.mjs*gateway*' -and
    $_.CommandLine -like "*--port $Port*"
  } |
  Select-Object -First 1

if ($existing) {
  Write-Host "OpenClaw Gateway is already running. PID=$($existing.ProcessId)"
  exit 0
}

$argumentList = @(
  $openClawEntry,
  'gateway',
  '--port',
  $Port.ToString(),
  '--allow-unconfigured'
)

Write-Host 'Starting OpenClaw Gateway...'
Write-Host "Resources: $resolvedResources"
Write-Host "Runtime: $nodeRuntime"
Write-Host "Entry: $openClawEntry"
Write-Host "WS: ws://localhost:$Port"
Write-Host 'Press Ctrl+C to stop.'
Write-Host ''

$env:OPENCLAW_NO_RESPAWN = '1'
$env:OPENCLAW_EMBEDDED_IN = 'ClawFast'

try {
  & $nodeRuntime @argumentList
  $exitCode = if ($LASTEXITCODE -is [int]) { $LASTEXITCODE } else { 0 }
  if ($exitCode -ne 0) {
    throw "OpenClaw Gateway exited with code $exitCode."
  }
} finally {
  Remove-Item Env:OPENCLAW_NO_RESPAWN -ErrorAction SilentlyContinue
  Remove-Item Env:OPENCLAW_EMBEDDED_IN -ErrorAction SilentlyContinue
}
