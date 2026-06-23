<#
.SYNOPSIS
    Production startup for Game Galaxy 2.0 (SvelteKit frontend + Python backend)
.DESCRIPTION
    Builds and launches both the SvelteKit frontend and Python FastAPI
    backend with proper production settings, logging, and graceful shutdown.
#>

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir "frontend"
$backendDir = Join-Path $rootDir "backend"
$logDir = Join-Path $rootDir "logs"
$frontendPort = 4321
$backendPort = 8000

function Write-Info  { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Step { Write-Host "[STEP] $args" -ForegroundColor Cyan }
function Write-Warn  { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err   { Write-Host "[ERROR] $args" -ForegroundColor Red }

Write-Step "Preflight checks..."

# Node.js check
$nodeVer = node --version 2>$null
if (-not $nodeVer) { Write-Err "Node.js not found in PATH"; exit 1 }
Write-Info "Node $nodeVer"

# Python check
$python = Get-Command "python" -ErrorAction SilentlyContinue
if (-not $python) { Write-Err "Python not found in PATH"; exit 1 }

# Prefer venv if available
$venvPython = Join-Path (Join-Path $backendDir "venv") "Scripts\python.exe"
if (Test-Path $venvPython) {
    $python = $venvPython
    Write-Info "Using venv Python: $venvPython"
} else {
    Write-Warn "No venv found at backend/venv - using system Python"
}

# Check .env for default secret key
$envFile = Join-Path $backendDir ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "SECRET_KEY=change-me-in-production") {
        Write-Warn ".env still has default SECRET_KEY - generate a real one for production"
        Write-Warn "  Run: python -c `"import secrets; print(secrets.token_hex(32))`""
    }
}

$pythonVersion = & $python --version 2>&1
Write-Info "$pythonVersion"

# Create log directory
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Build frontend
Write-Step "Building SvelteKit frontend..."
Set-Location $frontendDir
$ErrorActionPreference = "Continue"
$buildOutput = npm run build 2>&1 | Where-Object { $_ -notmatch "PLUGIN_TIMINGS" -and $_ -notmatch "NativeCommandError" }
$buildExitCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"
Set-Location $rootDir
if ($buildExitCode -ne 0) {
    Write-Err "Frontend build failed. Exit code: $buildExitCode"
    Write-Err "Build output:"
    $buildOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}
Write-Info "Frontend build complete"

# Start backend
Write-Step "Starting Python backend..."
$backendLog = Join-Path $logDir "backend.log"
$backendArgs = @(
    "-m", "uvicorn", "app.main:app"
    "--host", "127.0.0.1"
    "--port", "$backendPort"
    "--log-level", "info"
    "--no-access-log"
)

$backendProc = Start-Process -NoNewWindow -PassThru -FilePath $python `
    -ArgumentList $backendArgs `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendLog
Write-Info "Backend PID: $($backendProc.Id) - log: $backendLog"

# Wait for backend
Write-Step "Waiting for backend..."
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$backendPort/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $backendReady = $true; break }
    } catch { }
}
if (-not $backendReady) {
    Write-Err "Backend failed to start within 30s - check $backendLog"
    if (-not $backendProc.HasExited) { $backendProc.Kill() }
    exit 1
}
Write-Info "Backend ready at http://127.0.0.1:$backendPort"

# Start frontend (SvelteKit preview server)
Write-Step "Starting SvelteKit production server..."
$frontendLog = Join-Path $logDir "frontend.log"
$frontendProc = Start-Process -NoNewWindow -PassThru -FilePath "cmd.exe" `
    -ArgumentList "/c", "npx", "vite", "preview", "--port", "$frontendPort", "--host", "127.0.0.1" `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendLog
Write-Info "Frontend PID: $($frontendProc.Id) - log: $frontendLog"

# Wait for frontend
Write-Step "Waiting for frontend..."
$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 1
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$frontendPort/" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $frontendReady = $true; break }
    } catch { }
}
if (-not $frontendReady) {
    Write-Err "Frontend failed to start within 30s - check $frontendLog"
    if (-not $backendProc.HasExited) { $backendProc.Kill() }
    if (-not $frontendProc.HasExited) { $frontendProc.Kill() }
    exit 1
}

# Status
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Game Galaxy 2.0 - Production" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:$frontendPort" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:$backendPort" -ForegroundColor Green
Write-Host "  Logs:     $logDir" -ForegroundColor Cyan
Write-Host "  Ctrl+C to stop all services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Wait for Ctrl+C
try {
    while ($true) {
        Start-Sleep 1
        if ($backendProc.HasExited) {
            Write-Err "Backend process died unexpectedly - check $backendLog"
            break
        }
        if ($frontendProc.HasExited) {
            Write-Err "Frontend process died unexpectedly - check $frontendLog"
            break
        }
    }
} finally {
    Write-Host ""
    Write-Step "Shutting down..."
    if (-not $frontendProc.HasExited) {
        Write-Info "Stopping frontend (PID $($frontendProc.Id))..."
        $frontendProc.Kill()
    }
    if (-not $backendProc.HasExited) {
        Write-Info "Stopping backend (PID $($backendProc.Id))..."
        $backendProc.Kill()
    }
    Write-Info "All services stopped"
}
