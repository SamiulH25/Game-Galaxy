<#
.SYNOPSIS
    Stop any running Game Galaxy 2.0 production processes
.DESCRIPTION
    Kills any lingering Node.js (next start) and Python (uvicorn) processes
    that were started on the expected ports.
#>

$ports = @(4321, 8000)
$found = $false

foreach ($port in $ports) {
    $conn = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    if ($conn) {
        foreach ($line in $conn) {
            $parts = ($line -split '\s+') | Where-Object { $_ -ne '' }
            $processId = $parts[-1]
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -match "^(node|python)") {
                Write-Host "[INFO] Stopping $($proc.ProcessName) (PID $processId) on port $port" -ForegroundColor Green
                Stop-Process -Id $processId -Force
                $found = $true
            }
        }
    }
}

if (-not $found) {
    Write-Host "[INFO] No Game Galaxy processes found running" -ForegroundColor Green
}
