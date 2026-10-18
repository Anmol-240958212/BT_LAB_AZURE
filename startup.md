# 🚀 vaultOne Core Banking Platform — System Startup Guide

> **Target Audience**: Human Developers & Autonomous AI Agents.  
> **Supported Environments**: macOS, Linux, Windows (PowerShell / CMD), and Docker.  
> **Architecture**: Distributed microservices architecture composed of MySQL 8.0, Apache Kafka 4.1.0 (KRaft mode), 2 Spring Boot microservices, and an Angular 19+ SPA frontend.

---

## ⚡ Quick Endpoints Summary

Once all services are started, the entire platform is accessible via these URLs:

| Service / Layer | Component | URL | Description |
|---|---|---|---|
| **Frontend Web App** | Landing Page | [http://localhost:4200/](http://localhost:4200/) | Commercial customer landing page & yield simulator |
| **Frontend Web App** | Login Portal | [http://localhost:4200/login](http://localhost:4200/login) | Role-based authentication entry point |
| **Frontend Web App** | FD Calculator | [http://localhost:4200/fixed-deposit/calculator](http://localhost:4200/fixed-deposit/calculator) | Public fixed deposit projection tool |
| **Auth Microservice** | Swagger UI | [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html) | Interactive API tester for Auth & Customer APIs |
| **Auth Microservice** | OpenAPI JSON | [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs) | OpenAPI 3.0 specification contract |
| **Fixed Deposit Service** | Swagger UI | [http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html) | Interactive API tester for FD & Interest Engine |
| **Fixed Deposit Service** | OpenAPI JSON | [http://localhost:8081/v3/api-docs](http://localhost:8081/v3/api-docs) | OpenAPI 3.0 specification contract |
| **Fixed Deposit Service** | Actuator Health | [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health) | Spring Boot health check (`{"status":"UP"}`) |
| **Kafka Broker** | Event Stream | `localhost:9092` | Event broker for KYC events & FD maturity notifications |
| **MySQL Database** | RDBMS | `localhost:3306` | Databases: `authandcust` & `fdmodule` |

---

## 🔑 Pre-Seeded Test Credentials

| Role | Username / Email | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `bankadmin2026@gmail.com` | `Pass@123` | System management, batch processing, audit logs |
| **Branch Officer / Staff** | `jack.uat.2026@example.com` | `StaffPass@1` | KYC verification, assisted account booking |
| **Customer (KYC Verified)**| `ram.uat.2026@example.com` | `Pass@123` | Portfolio tracker, new FD application, premature closure |
| **Customer (Standby)**| `customer1` | `password123` | Fast simulation testing |

---

## 🤖 Instructions for AI Agents (Automated Execution)

When an AI Agent is asked to **"Read startup.md and start the project locally"**, the agent must execute these steps sequentially:

### Option 1: Using the Automated Turnkey Launch Script (Recommended)

#### On macOS or Linux:
```bash
chmod +x start.sh AUTHMODULET1/auth/mvnw FDMODULET2/mvnw
./start.sh
```

#### On Windows (PowerShell):
```powershell
.\start.ps1
```

---

### Option 2: Step-by-Step Autonomous Execution

If running step-by-step or in environments where granular process control is preferred:

#### Step 1: Ensure MySQL & Kafka Broker are Running
Default database credentials expected by Spring Boot:
- Host: `localhost:3306`
- User: `root` (or `$DB_USERNAME`)
- Password: `#Iamgood1` (or `$DB_PASSWORD`)

Kafka broker:
- Host: `localhost:9092`
- Run via Docker: `docker compose up -d kafka`

**If using local MySQL:**
```bash
# macOS / Linux
mysql -u root -p"#Iamgood1" -e "CREATE DATABASE IF NOT EXISTS authandcust; CREATE DATABASE IF NOT EXISTS fdmodule;"
mysql -u root -p"#Iamgood1" authandcust < AUTHMODULET1/authandcustDB.sql
```
```powershell
# Windows PowerShell
mysql -u root -p"#Iamgood1" -e "CREATE DATABASE IF NOT EXISTS authandcust; CREATE DATABASE IF NOT EXISTS fdmodule;"
Get-Content AUTHMODULET1\authandcustDB.sql | mysql -u root -p"#Iamgood1" authandcust
```

**If using Docker for Kafka & MySQL:**
```bash
docker compose up -d kafka
# (Optionally run 'docker compose up -d mysql' if local MySQL is not installed)
```
*(The included `docker-compose.yml` provides KRaft Kafka 4.1.0 on port 9092 and provisions both MySQL databases).*

---

#### Step 2: Start Backend 1 — Auth & Customer Service (Port 8080)
- Directory: `AUTHMODULET1/auth`
- Run as background process / daemon:

**macOS / Linux:**
```bash
cd AUTHMODULET1/auth
chmod +x mvnw
./mvnw spring-boot:run
```

**Windows:**
```powershell
cd AUTHMODULET1\auth
.\mvnw.cmd spring-boot:run
```

*Health Check URL:* `http://localhost:8080/swagger-ui/index.html`

---

#### Step 3: Start Backend 2 — Fixed Deposit Service (Port 8081)
- Directory: `FDMODULET2`
- Run as background process / daemon:

**macOS / Linux:**
```bash
cd FDMODULET2
chmod +x mvnw
./mvnw spring-boot:run
```

**Windows:**
```powershell
cd FDMODULET2
.\mvnw.cmd spring-boot:run
```

*Health Check URL:* `http://localhost:8081/actuator/health` (Wait until status is `UP`)  
*Swagger UI:* `http://localhost:8081/swagger-ui/index.html`

---

#### Step 4: Start Frontend — Angular Web Application (Port 4200)
- Directory: `FRONTEND`
- Run as background process / daemon:

**All Platforms:**
```bash
cd FRONTEND
npm install
npm start
```
*(The dev server is configured with `proxy.conf.json`, which automatically proxies API routes `/auth/**`, `/customer/**`, `/users/**` to `8080` and `/api/fd/**` to `8081`).*

*Access URL:* `http://localhost:4200/`

---

#### Step 5: Verification & Output Generation
The agent should verify readiness via HTTP and network checks:
1. `curl -s -I http://localhost:8080/swagger-ui/index.html` (returns 200 or 302)
2. `curl -s http://localhost:8081/actuator/health` (returns `{"status":"UP"}`)
3. `curl -s -I http://localhost:4200/` (returns 200)
4. `nc -z 127.0.0.1 9092` (Kafka broker port listening)

Once all checks pass, output the **Endpoints Summary table** and **Pre-Seeded Test Credentials table** to the user.

---

## 🛑 Stopping All Services

#### On macOS / Linux:
```bash
chmod +x stop.sh
./stop.sh
```
Or manually:
```bash
pkill -f "ng serve" || true
pkill -f "AUTHMODULET1" || pkill -f "auth-0.0.1" || true
pkill -f "FDMODULET2" || pkill -f "demo-0.0.1" || true
docker compose stop kafka || true
```

#### On Windows (PowerShell):
```powershell
.\stop.ps1
```
Or manually:
```powershell
Get-Process -Name "node", "java" -ErrorAction SilentlyContinue | Stop-Process -Force
docker compose stop kafka
```

---

## 🔧 Environment Variables Reference

Both Spring Boot services allow overriding database and email configurations via environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `DB_USERNAME` | `root` | MySQL username |
| `DB_PASSWORD` | `#Iamgood1` | MySQL password |
| `MAIL_USERNAME`| `bankingtech@demo.local` | SMTP sender email (FD Service) |
| `MAIL_PASSWORD`| `demo123` | SMTP password (FD Service) |
