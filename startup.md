# vaultOne Core Banking Platform — Startup Guide

This guide starts the local development stack: MySQL, Kafka, Auth & Customer, Fixed Deposit, Product & Pricing, and the Angular frontend.

## Services and URLs

| Service | URL / address | Purpose |
|---|---|---|
| Angular frontend | http://localhost:4200/ | Web application |
| Login | http://localhost:4200/login | Sign in |
| FD calculator | http://localhost:4200/fixed-deposit/calculator | FD projection using Product & Pricing quotes |
| Product management | http://localhost:4200/products | Bank officer/admin product and category-rate management |
| Auth Swagger | http://localhost:8080/swagger-ui/index.html | Auth & Customer API |
| Auth OpenAPI | http://localhost:8080/v3/api-docs | Auth & Customer API specification |
| FD Swagger | http://localhost:8081/swagger-ui/index.html | Fixed Deposit API |
| FD OpenAPI | http://localhost:8081/v3/api-docs | Fixed Deposit API specification |
| FD readiness | http://localhost:8081/actuator/health/readiness | FD readiness check (expect `UP`) |
| Product Swagger | http://localhost:8082/swagger-ui/index.html | Product & Pricing API |
| Product OpenAPI | http://localhost:8082/v3/api-docs | Product & Pricing API specification |
| Product API | http://localhost:8082/api/product | Product catalogue endpoints |
| MySQL | localhost:3306 | `authandcust`, `banking_tech2`, `fdmodule`, and `banking_product_db` |
| Kafka | localhost:9092 | KYC and FD maturity event broker |

The Angular dev-server proxy forwards `/auth/**`, `/customer/**`, `/users/**`, and `/api/auth/**` to Auth (8080), `/api/fd/**` to FD (8081), and `/api/product/**` to Product & Pricing (8082).

## Start the stack

Start MySQL and Kafka first. If using the existing local MySQL server, leave it running and start Kafka only:

```bash
docker compose up -d kafka
```

If MySQL is not installed locally, start both Compose services instead:

```bash
docker compose up -d mysql kafka
```

Compose MySQL uses `root` / `Shrey@26` and publishes port 3306. Do not start the Compose MySQL container when another MySQL server already owns port 3306. With an existing MySQL instance, make sure the configured DB user can create databases and use the same credentials for all services.

Run each command from the repository root in a separate terminal (or keep each process running in the background):

```bash
# Auth & Customer — port 8080
cd AUTHMODULET1/auth && ./mvnw spring-boot:run
```

```bash
# Fixed Deposit — port 8081
cd FDMODULET2 && ./mvnw spring-boot:run
```

```bash
# Product & Pricing — port 8082
DB_USERNAME=root DB_PASSWORD='Shrey@26' mvn -f PRODUCTMODULET3/product-pricing-service/pom.xml spring-boot:run
```

```bash
# Angular — port 4200
cd FRONTEND && npm install && npm start
```

Use environment variables for a non-default database login. Auth and FD default to `DB_USERNAME=root` and `DB_PASSWORD=Shrey@26`. Product & Pricing defaults to `root` / `root`, so pass the same `DB_USERNAME` and `DB_PASSWORD` used by the other services. The Product service creates `banking_product_db` if needed, runs its Flyway migrations, and validates its schema at startup.

On Windows PowerShell, start the first two services with `AUTHMODULET1\auth\mvnw.cmd spring-boot:run` and `FDMODULET2\mvnw.cmd spring-boot:run`. Start Product & Pricing with `$env:DB_USERNAME='root'; $env:DB_PASSWORD='Shrey@26'; mvn -f PRODUCTMODULET3\product-pricing-service\pom.xml spring-boot:run`. Start Angular with `cd FRONTEND; npm install; npm start`.

### One-command launcher

`./start.sh` launches Auth, FD, Product & Pricing, and Angular, and attempts to start missing Compose dependencies. It also imports `AUTHMODULET1/authandcustDB.sql` into `authandcust`; that SQL drops and recreates tables. Use this script only when you intend to reset the Auth/Customer schema, or start the services manually as above to preserve existing Auth/Customer data. The current `start.ps1` does not include Product & Pricing; use the PowerShell commands above on Windows.

## Product setup before testing

Product migrations create the Product & Pricing schema and reference data, but do not insert any products. Sign in as a bank officer or admin, open `/products`, and create an active FD product plus any required category-rate rules. The FD calculator and FD account creation screens load active products and request an effective-rate quote from Product & Pricing, so they need at least one active FD product to demonstrate the complete product-driven flow.

Product & Pricing accepts authenticated customer/staff reads and quote requests; product catalogue changes require a bank officer or admin. The frontend attaches the Auth JWT to proxied API requests. The Product service JWT secret must match Auth's `AUTH_JWT_SECRET` when that variable is overridden; both services use the same default secret in this local setup.

FD maturity email delivery needs valid SMTP settings (`BANKING_SMTP_HOST`, `BANKING_SMTP_PORT`, `BANKING_SMTP_USERNAME`, `BANKING_SMTP_PASSWORD`, and `BANKING_MAIL_FROM`). The FD readiness endpoint can be `UP` without SMTP configured; the overall `/actuator/health` may report `DOWN` because Spring's mail health check cannot authenticate. This does not prevent ordinary FD API testing, but email delivery requires working SMTP credentials.

## Test credentials

These accounts are expected in the seeded Auth/Customer database:

| Role | Username / email | Password |
|---|---|---|
| Admin | `bankadmin2026@gmail.com` | `Pass@123` |
| Branch officer / staff | `jack.uat.2026@example.com` | `StaffPass@1` |
| KYC verified customer | `ram.uat.2026@example.com` | `Pass@123` |
| Standby customer | `customer1` | `password123` |

## Verify service readiness

```bash
curl -sS -o /dev/null -w 'Auth %{http_code}\n' http://localhost:8080/swagger-ui/index.html
curl -sS http://localhost:8081/actuator/health/readiness
curl -sS -o /dev/null -w 'Product %{http_code}\n' http://localhost:8082/v3/api-docs
curl -sS -o /dev/null -w 'Frontend %{http_code}\n' http://localhost:4200/
nc -z 127.0.0.1 3306 && echo 'MySQL port open'
nc -z 127.0.0.1 9092 && echo 'Kafka port open'
```

Expected results are HTTP 200 for Auth, Product, and the frontend, `{"status":"UP"}` for FD readiness, and successful MySQL/Kafka port checks. To confirm Kafka responds to requests, run `docker exec banking-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list`.

## Stop services

Stop the four application processes with Ctrl+C in their terminals. Stop Kafka with `docker compose stop kafka`; stop Compose MySQL only if you started it with this repository using `docker compose stop mysql`. Do not stop a separately installed local MySQL server through Compose.
