# vaultOne local launcher for Windows PowerShell
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $RootDir ".runlogs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $RootDir

function Require-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command '$Name'. $InstallHint"
    }
}

function Wait-ForPort([int]$Port, [string]$Name, [int]$TimeoutSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $open = (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
        if ($open) {
            Write-Host "  OK $Name is listening on port $Port" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "$Name did not become ready on port $Port within $TimeoutSeconds seconds. Run 'docker compose ps' for details."
}

function Start-LoggedProcess([string]$Name, [string]$Directory, [string]$Command, [hashtable]$EnvironmentVariables) {
    $logFile = Join-Path $LogDir "$Name.log"
    $pidFile = Join-Path $LogDir "$Name.pid"
    $environmentSetup = ($EnvironmentVariables.GetEnumerator() | ForEach-Object {
        "set `"$($_.Key)=$($_.Value)`""
    }) -join " && "
    $prefix = if ([string]::IsNullOrWhiteSpace($environmentSetup)) { "" } else { "$environmentSetup && " }
    $cmdLine = "$prefix" + "cd /d `"$Directory`" && $Command > `"$logFile`" 2>&1"
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmdLine -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath $pidFile -Value $process.Id
    Write-Host "  Started $Name (PID $($process.Id)); log: $logFile" -ForegroundColor Green
}

Require-Command "docker" "Install Docker Desktop and ensure it is running."
Require-Command "java" "Install JDK 17 or newer."
Require-Command "mvn.cmd" "Install Maven 3.9+ and add it to PATH (Product & Pricing has no Maven wrapper)."
Require-Command "npm.cmd" "Install a Node.js version supported by Angular 22, then install npm."

$env:DB_USERNAME = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "root" }
$env:DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "#Iamgood1" }
$env:KAFKA_BOOTSTRAP_SERVERS = if ($env:KAFKA_BOOTSTRAP_SERVERS) { $env:KAFKA_BOOTSTRAP_SERVERS } else { "localhost:9092" }
$env:AUTH_JWT_SECRET = if ($env:AUTH_JWT_SECRET) { $env:AUTH_JWT_SECRET } else { "my-super-secret-key-for-authentication-123456789" }

Write-Host "Starting vaultOne infrastructure..." -ForegroundColor Cyan
if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded) {
    docker compose up -d mysql
} else {
    Write-Host "  Using the existing local MySQL service on port 3306" -ForegroundColor Green
}
docker compose up -d kafka
Wait-ForPort 3306 "MySQL"
Wait-ForPort 9092 "Kafka"

Write-Host "Starting three backend services..." -ForegroundColor Cyan
$localCommon = @{
    DB_HOST = "localhost"
    DB_PORT = "3306"
    DB_USERNAME = $env:DB_USERNAME
    DB_PASSWORD = $env:DB_PASSWORD
    KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
    AUTH_JWT_SECRET = $env:AUTH_JWT_SECRET
}
$authEnvironment = @{}; $localCommon.GetEnumerator() | ForEach-Object { $authEnvironment[$_.Key] = $_.Value }; $authEnvironment["DB_NAME"] = "authandcust"
$fdEnvironment = @{}; $localCommon.GetEnumerator() | ForEach-Object { $fdEnvironment[$_.Key] = $_.Value }; $fdEnvironment["DB_NAME"] = "fdmodule"
Start-LoggedProcess "auth" (Join-Path $RootDir "AUTHMODULET1\auth") "call mvnw.cmd spring-boot:run" $authEnvironment
Start-LoggedProcess "fd" (Join-Path $RootDir "FDMODULET2") "call mvnw.cmd spring-boot:run" $fdEnvironment
Start-LoggedProcess "product" (Join-Path $RootDir "PRODUCTMODULET3\product-pricing-service") "call mvn.cmd spring-boot:run" $localCommon

$frontendDir = Join-Path $RootDir "FRONTEND"
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try { & npm.cmd install } finally { Pop-Location }
}
Start-LoggedProcess "frontend" $frontendDir "call npm.cmd start" @{}

Write-Host ""
Write-Host "vaultOne processes have been launched." -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor White
Write-Host "Auth:     http://localhost:8080/swagger-ui/index.html" -ForegroundColor White
Write-Host "FD:       http://localhost:8081/swagger-ui/index.html" -ForegroundColor White
Write-Host "Product:  http://localhost:8082/swagger-ui/index.html" -ForegroundColor White
Write-Host "Logs:     $LogDir" -ForegroundColor White
Write-Host "Use .\stop.ps1 to stop the application and Docker infrastructure." -ForegroundColor White
