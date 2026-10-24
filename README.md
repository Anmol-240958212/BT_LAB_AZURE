# vaultOne Fixed Deposit Platform

vaultOne is a local microservice application with three Spring Boot backends, an Angular frontend, MySQL, and Apache Kafka.

## Start here

1. Install Docker Desktop, JDK 17+, Maven 3.9+, and a Node.js version supported by Angular 22.
2. Clone the repository.
3. Start everything from the repository root:

   **Windows PowerShell**

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```

   **macOS / Linux**

   ```bash
   chmod +x start.sh stop.sh
   ./start.sh
   ```

4. Open [http://localhost:4200](http://localhost:4200).

The launcher starts MySQL and Kafka through Docker Compose, then starts Auth on `8080`, Fixed Deposit on `8081`, Product & Pricing on `8082`, and Angular on `4200`. Application logs are written to `.runlogs/`.

Read [startup.md](startup.md) for prerequisites, manual startup, environment variables, initial data, verification, and troubleshooting. Read [KAFKA_SETUP.md](KAFKA_SETUP.md) for the topic catalog and Kafka diagnostics.

## Stop everything

```powershell
.\stop.ps1
```

or:

```bash
./stop.sh
```

## Repository layout

| Path | Component | Port |
|---|---|---:|
| `AUTHMODULET1/auth` | Authentication, users, KYC, employee management | 8080 |
| `FDMODULET2` | FD accounts, interest, withdrawal, maturity, notification, reporting | 8081 |
| `PRODUCTMODULET3/product-pricing-service` | Product catalogue and pricing | 8082 |
| `FRONTEND` | Angular application | 4200 |
| `docker-compose.yml` | MySQL 8 and Kafka 4.1 in KRaft mode | 3306 / 9092 |

The frontend calls the owning backend through `FRONTEND/proxy.conf.json`. Backend-to-backend integration uses Kafka.
