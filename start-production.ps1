<#
.SYNOPSIS
    Production startup for Game Galaxy 2.0 — unified single-server hosting.
.DESCRIPTION
    Builds the SvelteKit frontend, then serves BOTH the site shell and all
    game files from one FastAPI process on port 4321.
#>

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir "frontend"
$backendDir = Join-Path $rootDir "backend"
$logDir = Join-Path $rootDir "logs"
$port = 4321

function Write-Info  { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Step { Write-Host "[STEP] $args" -ForegroundColor Cyan }
function Write-Warn  { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err   { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Step "Preflight checks..."

$nodeVer = node --version 2>$null
if (-not $nodeVer) { Write-Err "Node.js not found in PATH"; exit 1 }
Write-Info "Node $nodeVer"

$python = Get-Command "python" -ErrorAction SilentlyContinue
if (-not $python) { Write-Err "Python not found in PATH"; exit 1 }

$venvPython = Join-Path (Join-Path $backendDir "venv") "Scripts\python.exe"
if (Test-Path $venvPython) {
    $python = $venvPython
    Write-Info "Using venv Python: $venvPython"
} else {
    Write-Warn "No venv found at backend/venv - using system Python"
}

$envFile = Join-Path $backendDir ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "SECRET_KEY=change-me-in-production") {
        Write-Warn ".env still has default SECRET_KEY - generate a real one for production"
    }
}

Write-Info (& $python --version 2>&1)

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Step "Building SvelteKit frontend..."
Set-Location $frontendDir
$ErrorActionPreference = "Continue"
$buildOutput = npm run build 2>&1 | Where-Object { $_ -notmatch "PLUGIN_TIMINGS" -and $_ -notmatch "NativeCommandError" }
$buildExitCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"
Set-Location $rootDir
if ($buildExitCode -ne 0) {
    Write-Err "Frontend build failed. Exit code: $buildExitCode"
    $buildOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}
Write-Info "Frontend build complete -> frontend/build"

Write-Step "Starting unified server (site + games + API)..."
$serverLog = Join-Path $logDir "server.log"
$serverArgs = @(
    "-m", "uvicorn", "app.main:app"
    "--host", "127.0.0.1"
    "--port", "$port"
    "--log-level", "info"
)

$serverProc = Start-Process -NoNewWindow -PassThru -FilePath $python `
    -ArgumentList $serverArgs `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $serverLog
Write-Info "Server PID: $($serverProc.Id) - log: $serverLog"

Write-Step "Waiting for server..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}
if (-not $ready) {
    Write-Err "Server failed to start within 30s - check $serverLog"
    if (-not $serverProc.HasExited) { $serverProc.Kill() }
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Game Galaxy 2.0 - Production" -ForegroundColor Green
Write-Host "  Open: http://localhost:$port" -ForegroundColor Green
Write-Host "  Serves: site + /games/* + /api/*" -ForegroundColor Green
Write-Host "  Logs:   $serverLog" -ForegroundColor Cyan
Write-Host "  Ctrl+C to stop" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep 1
        if ($serverProc.HasExited) {
            Write-Err "Server process died unexpectedly - check $serverLog"
            break
        }
    }
} finally {
    Write-Host ""
    Write-Step "Shutting down..."
    if (-not $serverProc.HasExited) {
        Write-Info "Stopping server (PID $($serverProc.Id))..."
        $serverProc.Kill()
    }
    Write-Info "Stopped"
}
