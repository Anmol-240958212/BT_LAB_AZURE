#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.runlogs"
mkdir -p "$LOG_DIR"
cd "$ROOT_DIR"

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command '$1'. $2" >&2; exit 1; }
}

wait_for_port() {
  local port="$1" name="$2" attempts=45
  for _ in $(seq 1 "$attempts"); do
    if (echo >"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1; then
      echo "  OK $name is listening on port $port"
      return 0
    fi
    sleep 2
  done
  echo "$name did not become ready on port $port. Run 'docker compose ps' for details." >&2
  exit 1
}

require_command docker "Install Docker Desktop/Engine with Compose."
require_command java "Install JDK 17 or newer."
require_command mvn "Install Maven 3.9+ (Product & Pricing has no Maven wrapper)."
require_command npm "Install a Node.js version supported by Angular 22."

export DB_USERNAME="${DB_USERNAME:-root}"
export DB_PASSWORD="${DB_PASSWORD:-#Iamgood1}"
export KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"
export AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-my-super-secret-key-for-authentication-123456789}"

echo "Starting vaultOne infrastructure..."
docker compose up -d mysql kafka
wait_for_port 3306 MySQL
wait_for_port 9092 Kafka

echo "Starting three backend services..."
chmod +x "$ROOT_DIR/AUTHMODULET1/auth/mvnw" "$ROOT_DIR/FDMODULET2/mvnw"
(cd "$ROOT_DIR/AUTHMODULET1/auth" && nohup ./mvnw spring-boot:run >"$LOG_DIR/auth.log" 2>&1 & echo $! >"$LOG_DIR/auth.pid")
(cd "$ROOT_DIR/FDMODULET2" && nohup ./mvnw spring-boot:run >"$LOG_DIR/fd.log" 2>&1 & echo $! >"$LOG_DIR/fd.pid")
(cd "$ROOT_DIR/PRODUCTMODULET3/product-pricing-service" && nohup mvn spring-boot:run >"$LOG_DIR/product.log" 2>&1 & echo $! >"$LOG_DIR/product.pid")

if [ ! -d "$ROOT_DIR/FRONTEND/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT_DIR/FRONTEND" && npm install)
fi
(cd "$ROOT_DIR/FRONTEND" && nohup npm start >"$LOG_DIR/frontend.log" 2>&1 & echo $! >"$LOG_DIR/frontend.pid")

cat <<EOF

vaultOne processes have been launched.
Frontend: http://localhost:4200
Auth:     http://localhost:8080/swagger-ui/index.html
FD:       http://localhost:8081/swagger-ui/index.html
Product:  http://localhost:8082/swagger-ui/index.html
Logs:     $LOG_DIR
Use ./stop.sh to stop the application and Docker infrastructure.
EOF
