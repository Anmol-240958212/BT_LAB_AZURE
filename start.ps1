# ==============================================================================
# vaultOne Banking Platform — Universal Startup Script (Windows PowerShell)
# ==============================================================================

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🚀 vaultOne Banking Platform — Starting All Local Services" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$dbUser = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "root" }
$dbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "Shrey@26" }

# 1. Database & Kafka Check & Setup
Write-Host ""
Write-Host "[1/4] Checking MySQL Database (port 3306) and Kafka (port 9092)..." -ForegroundColor Yellow
$mysqlUp = $false

try {
    mysql -u$dbUser -p$dbPass -e "SELECT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $mysqlUp = $true
        Write-Host "  ✔ Local MySQL server is reachable." -ForegroundColor Green
        mysql -u$dbUser -p$dbPass -e "CREATE DATABASE IF NOT EXISTS authandcust; CREATE DATABASE IF NOT EXISTS fdmodule;" 2>$null
        Get-Content "$RootDir\AUTHMODULET1\authandcustDB.sql" | mysql -u$dbUser -p$dbPass authandcust 2>$null
        Write-Host "  ✔ Databases 'authandcust' & 'fdmodule' verified and seeded." -ForegroundColor Green
    }
} catch {
    $mysqlUp = $false
}

if (-not $mysqlUp) {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "  -> Attempting to start MySQL via Docker Compose..." -ForegroundColor Gray
        docker compose up -d mysql
        Start-Sleep -Seconds 10
        Write-Host "  ✔ Docker MySQL container initiated." -ForegroundColor Green
    } else {
        Write-Host "  ⚠ WARNING: MySQL not detected on port 3306. Ensure MySQL service is running." -ForegroundColor Red
    }
}

# Check Kafka
$kafkaUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 9092 -WarningAction SilentlyContinue).TcpTestSucceeded
if ($kafkaUp) {
    Write-Host "  ✔ Kafka broker is running on port 9092." -ForegroundColor Green
} else {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "  -> Kafka not detected on port 9092. Starting Kafka via Docker Compose..." -ForegroundColor Gray
        docker compose up -d kafka
        Write-Host "  ✔ Kafka container started." -ForegroundColor Green
    } else {
        Write-Host "  ⚠ WARNING: Kafka is not running on port 9092. Start Kafka or run 'docker compose up -d kafka'." -ForegroundColor Red
    }
}

# 2. Start Backend 1 — Auth Service (Port 8080)
Write-Host ""
Write-Host "[2/4] Starting Auth Microservice (Port 8080)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$RootDir\AUTHMODULET1\auth`" && mvnw.cmd spring-boot:run" -WindowStyle Minimized
Write-Host "  ✔ Auth Microservice process spawned in background." -ForegroundColor Green

# 3. Start Backend 2 — Fixed Deposit Service (Port 8081)
Write-Host ""
Write-Host "[3/4] Starting Fixed Deposit Microservice (Port 8081)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$RootDir\FDMODULET2`" && mvnw.cmd spring-boot:run" -WindowStyle Minimized
Write-Host "  ✔ Fixed Deposit Microservice process spawned in background." -ForegroundColor Green

# 4. Start Frontend — Angular Web App (Port 4200)
Write-Host ""
Write-Host "[4/4] Starting Angular Frontend (Port 4200)..." -ForegroundColor Yellow
if (-not (Test-Path "$RootDir\FRONTEND\node_modules")) {
    Write-Host "  -> Installing frontend dependencies (npm install)..." -ForegroundColor Gray
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$RootDir\FRONTEND`" && npm install" -Wait
}
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$RootDir\FRONTEND`" && npm start" -WindowStyle Minimized
Write-Host "  ✔ Angular Frontend process spawned in background." -ForegroundColor Green

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🎉 All Services Successfully Launched!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Yellow
Write-Host "  • Frontend Web App:     http://localhost:4200/" -ForegroundColor White
Write-Host "  • Customer Login:       http://localhost:4200/login" -ForegroundColor White
Write-Host "  • FD Simulator:         http://localhost:4200/fixed-deposit/calculator" -ForegroundColor White
Write-Host "  • Auth Swagger UI:      http://localhost:8080/swagger-ui/index.html" -ForegroundColor White
Write-Host "  • Auth OpenAPI Docs:    http://localhost:8080/v3/api-docs" -ForegroundColor White
Write-Host "  • FD Swagger UI:        http://localhost:8081/swagger-ui/index.html" -ForegroundColor White
Write-Host "  • FD OpenAPI Docs:      http://localhost:8081/v3/api-docs" -ForegroundColor White
Write-Host "  • FD Health Check:      http://localhost:8081/actuator/health" -ForegroundColor White
Write-Host ""
Write-Host "Default Logins:" -ForegroundColor Yellow
Write-Host "  • Admin:      bankadmin2026@gmail.com / Pass@123" -ForegroundColor White
Write-Host "  • Officer:    jack.uat.2026@example.com / StaffPass@1" -ForegroundColor White
Write-Host "  • Customer:   ram.uat.2026@example.com / Pass@123" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
