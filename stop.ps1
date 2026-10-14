# ==============================================================================
# vaultOne Banking Platform — Stop All Local Services (Windows PowerShell)
# ==============================================================================

Write-Host "Stopping vaultOne Banking Platform services..." -ForegroundColor Yellow

Get-Process -Name "node", "java" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "  ✔ All local services stopped." -ForegroundColor Green
