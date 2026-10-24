# vaultOne local startup guide

This guide is the source of truth for running a fresh clone. The platform consists of MySQL, Kafka, three Spring Boot services, and one Angular application.

## 1. Prerequisites

- Git
- Docker Desktop or Docker Engine with the Compose plugin
- JDK 17 or newer
- Maven 3.9 or newer; the Product & Pricing service currently uses the system `mvn` command
- Node.js supported by Angular 22: Node `22.22.3+`, `24.15.0+`, or `26+`
- npm

Confirm the tools are visible in a new terminal:

```text
docker --version
docker compose version
java -version
mvn -version
node --version
npm --version
```

Ports `3306`, `9092`, `8080`, `8081`, `8082`, and `4200` must be available.

## 2. One-command startup

The launchers use Docker for MySQL and Kafka, apply development defaults, start all three backends, install frontend dependencies when needed, and write logs to `.runlogs/`.

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

### macOS / Linux

```bash
chmod +x start.sh stop.sh AUTHMODULET1/auth/mvnw FDMODULET2/mvnw
./start.sh
```

Startup is asynchronous. The processes are launched after MySQL and Kafka accept connections; the Spring applications can take another minute to finish initialization. Check `.runlogs/auth.log`, `.runlogs/fd.log`, `.runlogs/product.log`, and `.runlogs/frontend.log` if a service does not appear.

## 3. Services and URLs

| Component | URL / address | Purpose |
|---|---|---|
| Angular frontend | `http://localhost:4200` | Browser application |
| Auth Swagger | `http://localhost:8080/swagger-ui/index.html` | Auth, customer, KYC and employee APIs |
| FD Swagger | `http://localhost:8081/swagger-ui/index.html` | FD, batch, withdrawal and report APIs |
| Product Swagger | `http://localhost:8082/swagger-ui/index.html` | Product and pricing APIs |
| Product health | `http://localhost:8082/api/health` | Product service liveness |
| Kafka | `localhost:9092` | Inter-module messaging |
| MySQL | `localhost:3306` | Local databases |

The databases are:

- `authandcust` for Auth and customer data
- `fdmodule` for fixed-deposit data
- `banking_product_db` for Product & Pricing

On the first Docker startup, `AUTHMODULET1/authandcustDB.sql` initializes Auth data and `docker/init-db.sql` creates the FD database. Hibernate creates or updates the FD and Product schemas. Docker volumes preserve data across normal stop/start cycles.

## 4. Development credentials

The checked-in Auth seed includes these local accounts:

| Role | Username | Password |
|---|---|---|
| Admin | `bankadmin2026@gmail.com` | `Pass@123` |
| Staff / officer | `jack.uat.2026@example.com` | `StaffPass@1` |
| Customer | `ram.uat.2026@example.com` | `Pass@123` |

These credentials are for local development only.

## 5. Manual startup

Use five terminals from the repository root.

### Terminal 1: MySQL and Kafka

```bash
docker compose up -d mysql kafka
docker compose ps
```

Wait until both containers are running and Kafka is healthy.

### Terminal 2: Auth service

Windows:

```powershell
cd AUTHMODULET1\auth
.\mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
cd AUTHMODULET1/auth
./mvnw spring-boot:run
```

### Terminal 3: Fixed Deposit service

Windows:

```powershell
cd FDMODULET2
.\mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
cd FDMODULET2
./mvnw spring-boot:run
```

### Terminal 4: Product & Pricing service

```bash
cd PRODUCTMODULET3/product-pricing-service
mvn spring-boot:run
```

### Terminal 5: Angular frontend

```bash
cd FRONTEND
npm install
npm start
```

Start Kafka before the backends. Start all three backends before testing account creation or reports because FD uses Kafka request/reply calls to Auth and Product & Pricing.

## 6. Environment variables

The launch scripts set usable development defaults for the current terminal and their child processes.

| Variable | Development default | Used by |
|---|---|---|
| `DB_USERNAME` | `root` | All backends |
| `DB_PASSWORD` | `#Iamgood1` | All backends and Docker MySQL |
| `DB_NAME` | `fdmodule` | FD service |
| `DB_HOST` | `localhost` | Product service |
| `DB_PORT` | `3306` | Product service |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | All backends |
| `AUTH_JWT_SECRET` | local development signing key | Product JWT validation |
| `BANKING_SMTP_HOST` | `smtp.gmail.com` | Auth and FD mail |
| `BANKING_SMTP_PORT` | `587` | Auth and FD mail |
| `BANKING_SMTP_USERNAME` | empty | Auth and FD mail |
| `BANKING_SMTP_PASSWORD` | empty | Auth and FD mail |
| `BANKING_MAIL_FROM` | SMTP username | FD notifications |

Email is optional for startup. Set the SMTP variables before launching if OTP and FD maturity/premature-withdrawal emails must be delivered. Do not commit mail credentials.

PowerShell example for the current terminal:

```powershell
$env:BANKING_SMTP_USERNAME = "sender@example.com"
$env:BANKING_SMTP_PASSWORD = "app-password"
.\start.ps1
```

Bash example:

```bash
export BANKING_SMTP_USERNAME='sender@example.com'
export BANKING_SMTP_PASSWORD='app-password'
./start.sh
```

## 7. Verify the running system

```bash
docker compose ps
curl http://localhost:8082/api/health
curl -I http://localhost:4200
```

Open the three Swagger URLs from the service table. For Kafka topic and pipeline checks, follow [KAFKA_SETUP.md](KAFKA_SETUP.md).

## 8. Stop and reset

Stop application processes and infrastructure:

```powershell
.\stop.ps1
```

or:

```bash
./stop.sh
```

To start again, rerun the matching start script. Data remains in Docker volumes.

To deliberately erase all local MySQL and Kafka data and recreate a clean database, stop the application and run:

```bash
docker compose down -v
```

This command permanently deletes the local Docker data volumes.

## 9. Common problems

| Symptom | Resolution |
|---|---|
| `npm.ps1 cannot be loaded because running scripts is disabled` | Use `npm.cmd install` / `npm.cmd start`, or run the supplied `start.ps1` through the bypass command shown above. |
| Angular reports an unsupported Node version | Install one of the Node versions listed in prerequisites and open a new terminal. |
| FD account creation times out | Confirm Kafka, Auth, FD and Product are all running. Account creation needs Auth and Product Kafka replies. |
| Reports stay on loading | Check FD and Auth logs, then confirm the Auth report request/reply topics exist. |
| MySQL access denied | Ensure `DB_PASSWORD` matches the Docker value `#Iamgood1`; remove an old incompatible volume only if its data can be discarded. |
| Product service cannot start | Confirm the system `mvn` command exists and port `8082` is free. |
| Emails fail | Set valid SMTP environment variables; mail credentials are intentionally not stored in Git. |
