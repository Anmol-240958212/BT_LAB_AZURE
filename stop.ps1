# vaultOne local shutdown for Windows PowerShell
$ErrorActionPreference = "Continue"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $RootDir ".runlogs"

foreach ($name in @("frontend", "product", "fd", "auth")) {
    $pidFile = Join-Path $LogDir "$name.pid"
    if (Test-Path $pidFile) {
        $processId = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($processId -match '^\d+$') {
            & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
            Write-Host "Stopped $name process tree (PID $processId)." -ForegroundColor Green
        }
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }
}

Set-Location $RootDir
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose stop mysql kafka | Out-Null
    Write-Host "Stopped MySQL and Kafka containers." -ForegroundColor Green
}
