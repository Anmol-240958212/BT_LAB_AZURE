#!/usr/bin/env bash
# ==============================================================================
# vaultOne Banking Platform — Universal Startup Script (macOS / Linux)
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "================================================================="
echo "  🚀 vaultOne Banking Platform — Starting All Local Services"
echo "================================================================="

DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-Shrey@26}"

# 1. Database & Kafka Check & Setup
echo ""
echo "[1/4] Checking MySQL Database (port 3306) and Kafka (port 9092)..."
MYSQL_UP=false

if mysql -u"$DB_USER" -p"$DB_PASS" -h 127.0.0.1 -e "SELECT 1;" >/dev/null 2>&1; then
    MYSQL_UP=true
    echo "  ✔ Local MySQL server is running."
    mysql -u"$DB_USER" -p"$DB_PASS" -h 127.0.0.1 -e "CREATE DATABASE IF NOT EXISTS authandcust; CREATE DATABASE IF NOT EXISTS banking_tech2; CREATE DATABASE IF NOT EXISTS fdmodule;" >/dev/null 2>&1
    mysql -u"$DB_USER" -p"$DB_PASS" -h 127.0.0.1 authandcust < "$ROOT_DIR/AUTHMODULET1/authandcustDB.sql" >/dev/null 2>&1 || true
    echo "  ✔ Databases 'authandcust', 'banking_tech2' & 'fdmodule' verified and seeded."
elif command -v docker >/dev/null 2>&1; then
    echo "  -> Local MySQL not reachable. Attempting to start MySQL via Docker Compose..."
    docker compose up -d mysql
    echo "  -> Waiting for MySQL container to become ready..."
    for i in {1..30}; do
        if docker exec -i vaultone-mysql mysql -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1;" >/dev/null 2>&1; then
            MYSQL_UP=true
            echo "  ✔ MySQL container is up and running on port 3306."
            break
        fi
        sleep 1
    done
fi

if [ "$MYSQL_UP" = false ]; then
    echo "  ⚠ WARNING: Could not connect to MySQL. Ensure MySQL is running on port 3306 with password '$DB_PASS'."
fi

# Check Kafka
if nc -z 127.0.0.1 9092 >/dev/null 2>&1; then
    echo "  ✔ Kafka broker is running on port 9092."
elif command -v docker >/dev/null 2>&1; then
    echo "  -> Kafka not detected on port 9092. Starting Kafka via Docker Compose..."
    docker compose up -d kafka
    echo "  ✔ Kafka container started."
else
    echo "  ⚠ WARNING: Kafka is not running on port 9092. Start Kafka or run 'docker compose up -d kafka'."
fi

# 2. Start Backend 1 — Auth Service (Port 8080)
echo ""
echo "[2/4] Starting Auth Microservice (Port 8080)..."
cd "$ROOT_DIR/AUTHMODULET1/auth"
chmod +x mvnw
nohup ./mvnw spring-boot:run > "$ROOT_DIR/auth-service.log" 2>&1 &
AUTH_PID=$!
echo "  ✔ Auth Microservice launched (PID: $AUTH_PID, logs: auth-service.log)"

# 3. Start Backend 2 — Fixed Deposit Service (Port 8081)
echo ""
echo "[3/4] Starting Fixed Deposit Microservice (Port 8081)..."
cd "$ROOT_DIR/FDMODULET2"
chmod +x mvnw
nohup ./mvnw spring-boot:run > "$ROOT_DIR/fd-service.log" 2>&1 &
FD_PID=$!
echo "  ✔ Fixed Deposit Microservice launched (PID: $FD_PID, logs: fd-service.log)"

# 4. Start Frontend — Angular Web App (Port 4200)
echo ""
echo "[4/4] Starting Angular Frontend (Port 4200)..."
cd "$ROOT_DIR/FRONTEND"
if [ ! -d "node_modules" ]; then
    echo "  -> Installing frontend dependencies (npm install)..."
    npm install --silent
fi
nohup npm start > "$ROOT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  ✔ Angular Frontend launched (PID: $FRONTEND_PID, logs: frontend.log)"

cd "$ROOT_DIR"

echo ""
echo "================================================================="
echo "  🎉 All Services Successfully Launched!"
echo "================================================================="
echo ""
echo "Endpoints:"
echo "  • Frontend Web App:     http://localhost:4200/"
echo "  • Customer Login:       http://localhost:4200/login"
echo "  • FD Simulator:         http://localhost:4200/fixed-deposit/calculator"
echo "  • Auth Swagger UI:      http://localhost:8080/swagger-ui/index.html"
echo "  • Auth OpenAPI Docs:    http://localhost:8080/v3/api-docs"
echo "  • FD Swagger UI:        http://localhost:8081/swagger-ui/index.html"
echo "  • FD OpenAPI Docs:      http://localhost:8081/v3/api-docs"
echo "  • FD Health Check:      http://localhost:8081/actuator/health"
echo ""
echo "Default Logins:"
echo "  • Admin:      bankadmin2026@gmail.com / Pass@123"
echo "  • Officer:    jack.uat.2026@example.com / StaffPass@1"
echo "  • Customer:   ram.uat.2026@example.com / Pass@123"
echo "================================================================="
