<#
.SYNOPSIS
    Development startup for Game Galaxy 2.0 - installs deps, migrates DB, runs hot-reload servers.
.DESCRIPTION
    Sets up the local dev environment (venv, npm, .env, alembic) if needed, then starts:
      - FastAPI backend with --reload on port 8000 (or next free port)
      - Vite/SvelteKit frontend dev server on port 5173 (proxies /api and /games)
#>

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir "frontend"
$backendDir = Join-Path $rootDir "backend"
$logDir = Join-Path $rootDir "logs"
$defaultBackendPort = 8000
$defaultFrontendPort = 5173
$devHost = "0.0.0.0"
$backendPort = $defaultBackendPort
$frontendPort = $defaultFrontendPort

function Get-LanIPv4Addresses {
    $ips = @()
    try {
        $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -notlike "127.*" -and
                $_.IPAddress -notlike "169.254.*"
            } |
            Select-Object -ExpandProperty IPAddress -Unique
    } catch {
        $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { $_.AddressFamily -eq "InterNetwork" -and $_.ToString() -notlike "127.*" } |
            ForEach-Object { $_.ToString() }
    }
    return @($ips | Where-Object { $_ })
}

function Write-Info  { Write-Host "[INFO] $args" -ForegroundColor Green }
function Write-Step  { Write-Host "[STEP] $args" -ForegroundColor Cyan }
function Write-Warn  { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err   { Write-Host "[ERROR] $args" -ForegroundColor Red }

function Get-PortOwnerPid {
    param([int]$Port)
    $lines = netstat -ano | Select-String "LISTENING" | Select-String ":$Port\s"
    foreach ($line in $lines) {
        $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
        $processId = [int]$parts[-1]
        if ($processId -gt 0) { return $processId }
    }
    return $null
}

function Test-PortListening {
    param([int]$Port)
    return $null -ne (Get-PortOwnerPid -Port $Port)
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return }
    $null = Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$ProcessId", "/T", "/F") `
        -NoNewWindow -Wait -ErrorAction SilentlyContinue
}

function Stop-PortListeners {
    param(
        [int[]]$Ports,
        [string]$Label
    )
    $stopped = $false
    foreach ($port in $Ports) {
        for ($attempt = 0; $attempt -lt 5; $attempt++) {
            $processId = Get-PortOwnerPid -Port $port
            if (-not $processId) { break }
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if (-not $proc) { break }
            if ($proc.ProcessName -notmatch "^(node|python)$") {
                Write-Warn "Port $port is used by $($proc.ProcessName) (PID $processId) - not stopping automatically"
                break
            }
            Write-Info "Stopping stale $Label $($proc.ProcessName) (PID $processId) on port $port"
            Stop-ProcessTree -ProcessId $processId
            $stopped = $true
            Start-Sleep -Milliseconds 600
        }
    }
    return $stopped
}

function Find-FreePort {
    param(
        [int]$Preferred,
        [int]$MaxTries = 20
    )
    for ($offset = 0; $offset -lt $MaxTries; $offset++) {
        $candidate = $Preferred + $offset
        if (-not (Test-PortListening -Port $candidate)) {
            if ($offset -gt 0) {
                Write-Warn "Port $Preferred busy - using $candidate instead"
            }
            return $candidate
        }
    }
    return $null
}

function Stop-DevProcs {
    param($BackendProc, $FrontendProc)
    if ($FrontendProc -and -not $FrontendProc.HasExited) {
        Write-Info "Stopping frontend (PID $($FrontendProc.Id))..."
        Stop-ProcessTree -ProcessId $FrontendProc.Id
    }
    if ($BackendProc -and -not $BackendProc.HasExited) {
        Write-Info "Stopping backend (PID $($BackendProc.Id))..."
        Stop-ProcessTree -ProcessId $BackendProc.Id
    }
}

function Initialize-LogFile {
    param([string]$Path)
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    try {
        Set-Content -Path $Path -Value "" -Encoding UTF8 -ErrorAction Stop
        return $Path
    } catch {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $alt = Join-Path $dir (([IO.Path]::GetFileNameWithoutExtension($Path)) + "-$stamp.log")
        Write-Warn "Log file locked ($Path) - using $alt"
        Set-Content -Path $alt -Value "" -Encoding UTF8
        return $alt
    }
}

function Show-LogTail {
    param([string]$Path, [int]$Lines = 12)
    if (-not (Test-Path $Path)) { return }
    Write-Warn "Last $Lines lines of $Path :"
    Get-Content -Path $Path -Tail $Lines -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  $_" -ForegroundColor DarkGray
    }
}

Write-Step "Preflight checks..."

$nodeVer = node --version 2>$null
if (-not $nodeVer) { Write-Err "Node.js not found in PATH"; exit 1 }
Write-Info "Node $nodeVer"

$npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
}
if (-not $npmCmd) { Write-Err "npm not found in PATH"; exit 1 }

$pythonCmd = Get-Command "python" -ErrorAction SilentlyContinue
if (-not $pythonCmd) { Write-Err "Python not found in PATH"; exit 1 }

$venvDir = Join-Path $backendDir "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Step "Setting up backend..."
if (-not (Test-Path $venvPython)) {
    Write-Info "Creating Python venv at backend/venv"
    & python -m venv $venvDir
    if ($LASTEXITCODE -ne 0) { Write-Err "Failed to create venv"; exit 1 }
}

Write-Info (& $venvPython --version 2>&1)
Write-Info "Installing Python dependencies..."
$ErrorActionPreference = "Continue"
& $venvPip install -r (Join-Path $backendDir "requirements.txt") 2>&1 | Out-Null
$pipExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($pipExit -ne 0) { Write-Err "pip install failed"; exit 1 }

$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Info "Creating backend/.env with development defaults"
    @"
DATABASE_URL=sqlite+aiosqlite:///./game_galaxy.db
SECRET_KEY=dev-secret-not-for-production
DEBUG=true
HOST=0.0.0.0
"@ | Set-Content -Path $envFile -Encoding UTF8
} else {
    Write-Info "Using existing backend/.env"
}

Write-Step "Running database migrations..."
Push-Location $backendDir
$ErrorActionPreference = "Continue"
$migrateOutput = & $venvPython -m alembic upgrade head 2>&1
$migrateExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
Pop-Location
if ($migrateExit -ne 0) {
    Write-Err "Alembic migration failed"
    $migrateOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}
Write-Info "Database ready"

Write-Step "Setting up frontend..."
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Info "Installing frontend dependencies..."
    Push-Location $frontendDir
    $ErrorActionPreference = "Continue"
    $npmOutput = & $npmCmd.Source install 2>&1
    $npmExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    Pop-Location
    if ($npmExit -ne 0) {
        Write-Err "npm install failed"
        $npmOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        exit 1
    }
} else {
    Write-Info "Frontend node_modules present"
}

Write-Step "Preparing dev ports..."
$stopScript = Join-Path $rootDir "stop-dev.ps1"
if (Test-Path $stopScript) {
    & $stopScript | Out-Null
    Start-Sleep -Seconds 1
}
$devPorts = @(8000..8010) + @(5173..5182)
if (Stop-PortListeners -Ports $devPorts -Label "dev") {
    Start-Sleep -Seconds 2
}

$backendPort = Find-FreePort -Preferred $defaultBackendPort
$frontendPort = Find-FreePort -Preferred $defaultFrontendPort
if (-not $backendPort -or -not $frontendPort) {
    Write-Err "Could not find free ports for backend/frontend"
    exit 1
}

$backendLog = Initialize-LogFile -Path (Join-Path $logDir "dev-backend.log")
$frontendLog = Initialize-LogFile -Path (Join-Path $logDir "dev-frontend.log")

$env:GAME_GALAXY_BACKEND_PORT = "$backendPort"

Write-Step "Starting backend (reload) on port $backendPort..."
$backendProc = Start-Process -NoNewWindow -PassThru -FilePath $venvPython `
    -ArgumentList @(
        "-m", "uvicorn", "app.main:app",
        "--reload",
        "--host", $devHost,
        "--port", "$backendPort",
        "--log-level", "info"
    ) `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendLog
Write-Info "Backend PID: $($backendProc.Id) - log: $backendLog"

Start-Sleep -Milliseconds 800
if ($backendProc.HasExited) {
    Write-Err "Backend exited immediately (port $backendPort may be blocked)"
    Show-LogTail -Path $backendLog
    exit 1
}

Write-Step "Starting frontend dev server on port $frontendPort..."
$frontendProc = Start-Process -NoNewWindow -PassThru -FilePath $npmCmd.Source `
    -ArgumentList @("run", "dev", "--", "--host", $devHost, "--port", "$frontendPort", "--strictPort") `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendLog
Write-Info "Frontend PID: $($frontendProc.Id) - log: $frontendLog"

Start-Sleep -Milliseconds 800
if ($frontendProc.HasExited) {
    Write-Err "Frontend exited immediately (port $frontendPort may be blocked)"
    Show-LogTail -Path $frontendLog
    Stop-DevProcs -BackendProc $backendProc -FrontendProc $frontendProc
    exit 1
}

Write-Step "Waiting for services..."
$backendReady = $false
$frontendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep 1

    if ($backendProc.HasExited) {
        Write-Err "Backend process died during startup"
        Show-LogTail -Path $backendLog
        Stop-DevProcs -BackendProc $backendProc -FrontendProc $frontendProc
        exit 1
    }
    if ($frontendProc.HasExited) {
        Write-Err "Frontend process died during startup"
        Show-LogTail -Path $frontendLog
        Stop-DevProcs -BackendProc $backendProc -FrontendProc $frontendProc
        exit 1
    }

    if (-not $backendReady) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$backendPort/api/health" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $backendReady = $true }
        } catch { }
    }

    if (-not $frontendReady) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$frontendPort" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $frontendReady = $true }
        } catch { }
    }

    if ($backendReady -and $frontendReady) { break }
}

if (-not $backendReady) {
    Write-Err "Backend failed to start within 45s on port $backendPort"
    Show-LogTail -Path $backendLog
    Stop-DevProcs -BackendProc $backendProc -FrontendProc $frontendProc
    exit 1
}
if (-not $frontendReady) {
    Write-Err "Frontend failed to start within 45s on port $frontendPort"
    Show-LogTail -Path $frontendLog
    Stop-DevProcs -BackendProc $backendProc -FrontendProc $frontendProc
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Game Galaxy 2.0 - Development" -ForegroundColor Green
Write-Host "  Local:  http://127.0.0.1:$frontendPort" -ForegroundColor Green
$lanIps = Get-LanIPv4Addresses
if ($lanIps.Count -gt 0) {
    Write-Host "  LAN:" -ForegroundColor Green
    foreach ($ip in $lanIps) {
        Write-Host "          http://${ip}:$frontendPort" -ForegroundColor Green
    }
} else {
    Write-Host "  LAN:    (no IPv4 address found - check network adapter)" -ForegroundColor Yellow
}
Write-Host "  API:    http://127.0.0.1:$backendPort/api/health" -ForegroundColor Green
Write-Host "  Logs:   $backendLog" -ForegroundColor Cyan
Write-Host "          $frontendLog" -ForegroundColor Cyan
Write-Host "  Ctrl+C to stop both servers" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep 1
        if ($backendProc.HasExited) {
            Write-Err "Backend process died unexpectedly - check $backendLog"
            Show-LogTail -Path $backendLog
            break
        }
        if ($frontendProc.HasExited) {
            Write-Err "Frontend process died unexpectedly - check $frontendLog"
            Show-LogTail -Path $frontendLog
            break
        }
    }
} finally {
    Write-Host ""
    Write-Step "Shutting down..."
    Stop-DevProcs -BackendProc $backendProc -FrontendProc $frontendProc
    Write-Info "Stopped"
}
