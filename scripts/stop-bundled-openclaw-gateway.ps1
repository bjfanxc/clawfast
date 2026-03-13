param(
  [int]$Port = 18789
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$targets = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -like '*openclaw.mjs*gateway*' -and
    $_.CommandLine -like "*--port $Port*"
  }

if (-not $targets) {
  Write-Host "No running OpenClaw Gateway found on port $Port."
  exit 0
}

foreach ($target in $targets) {
  Stop-Process -Id $target.ProcessId -Force
  Write-Host "Stopped OpenClaw Gateway. PID=$($target.ProcessId)"
}
