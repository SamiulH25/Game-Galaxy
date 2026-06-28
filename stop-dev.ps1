<#
.SYNOPSIS
    Stop any running Game Galaxy 2.0 development processes
.DESCRIPTION
    Kills Node.js (Vite dev) and Python (uvicorn --reload) processes
    listening on the development ports.
#>

$ports = 5173..5182 + 8000..8010
$found = $false

foreach ($port in $ports) {
    $conn = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s"
    if ($conn) {
        foreach ($line in $conn) {
            $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
            $processId = $parts[-1]
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -match "^(node|python)$") {
                Write-Host "[INFO] Stopping $($proc.ProcessName) (PID $processId) on port $port" -ForegroundColor Green
                $null = Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$processId", "/T", "/F") `
                    -NoNewWindow -Wait -ErrorAction SilentlyContinue
                $found = $true
            }
        }
    }
}

if (-not $found) {
    Write-Host "[INFO] No Game Galaxy dev processes found running" -ForegroundColor Green
}
