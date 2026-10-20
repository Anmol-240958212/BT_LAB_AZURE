# 🏛️ vaultOne Core Banking Platform — System Context & Architecture Guide (`context.md`)

> **Platform**: vaultOne Core Banking System (Banking Technology Lab — CSF 3142)  
> **Architecture Style**: Microservices Architecture, Event-Driven Integration (Apache Kafka), Angular Single Page Application (SPA), MySQL RDBMS  
> **Last Updated**: October 2026

---

## 📑 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [High-Level Architecture & System Topology](#-high-level-architecture--system-topology)
3. [Service Matrix & Endpoints](#-service-matrix--endpoints)
4. [Subsystem Deep Dives](#-subsystem-deep-dives)
   - [Auth & Customer Module (`AUTHMODULET1`)](#1-auth--customer-microservice-authmodulet1)
   - [Fixed Deposit Module (`FDMODULET2`)](#2-fixed-deposit-microservice-fdmodulet2)
   - [Product & Pricing Module (`PRODUCTMODULET3`)](#3-product--pricing-microservice-productmodulet3)
   - [Frontend Web App (`FRONTEND`)](#4-frontend-web-application-frontend)
5. [Kafka Event-Driven Architecture](#-kafka-event-driven-architecture)
6. [Database Schema & Data Tier](#-database-schema--data-tier)
7. [Security & Role-Based Access Control (RBAC)](#-security--role-based-access-control-rbac)
8. [Setup, Run & Operational Workflows](#-setup-run--operational-workflows)
9. [Pre-Seeded Credentials & Testing Persona](#-pre-seeded-credentials--testing-persona)

---

## 📌 Executive Summary

**vaultOne** is an enterprise-grade core banking platform developed for modern deposit management, product pricing, and customer relationship operations. The platform integrates:
- User onboarding and KYC management with multi-factor authentication (OTP verification).
- A regulatory-compliant Fixed Deposit (FD) simulation, booking, interest accrual, and maturity lifecycle engine.
- A dynamic Product Catalogue and Pricing Service supporting tiered interest rate matrices, customer category add-on rules, and fee/penalty administration.
- A high-throughput, decoupled event mesh powered by Apache Kafka (KRaft mode) for eventual consistency, catalogue sync, asynchronous notifications, and inter-service request-reply RPCs.
- An interactive, responsive Angular 19+ Single Page Application with light/dark themes, role-based dashboards, and financial yield simulators.

---

## 🏗️ High-Level Architecture & System Topology

```
                                      +------------------------------------+
                                      |     Client Browser / User Agent    |
                                      +-----------------+------------------+
                                                        |
                                                        | HTTP/REST (Port 4200)
                                                        v
                                      +------------------------------------+
                                      |     vaultOne Angular SPA (4200)    |
                                      |  (Proxy routes: /auth, /api/fd,    |
                                      |   /api/product, /customer, /users) |
                                      +---+-------------+--------------+---+
                                          |             |              |
                    HTTP /auth, /customer |             | HTTP /api/fd | HTTP /api/product
                                          v             |              v
+-------------------------------------------+           |  +-------------------------------------------+
|    Auth & Customer Service (Port 8080)    |           |  |     Product & Pricing Service (Port 8082) |
|  - Spring Boot 3 / Java 17                |           |  |  - Spring Boot 3 / Java 17                |
|  - JWT Issuer & Role Provider             |           |  |  - Dynamic Rate Matrices & Category Caps  |
|  - Customer CIF & KYC Verification        |           |  |  - Flyway Migrations & Product Audit Log  |
+---------------------+---------------------+           |  +---------------------+---------------------+
                      |                                 |                        |
             Kafka    |                                 v               Kafka    |
           Events/RPC |               +------------------------------------+     | Events/RPC
                      |               |    Fixed Deposit Service (Port 8081)|     |
                      |               |  - Spring Boot 3 / Java 17         |     |
                      |               |  - Simulation Engine (Strategy)    |     |
                      |               |  - FD Booking & Lifecycle Mgmt     |     |
                      |               |  - Batch Interest & Maturity Engine|     |
                      |               |  - Email Notification Dispatcher   |     |
                      |               +------------------+-----------------+     |
                      |                                  |                       |
                      +-------------------+              |              +--------+
                                          |              |              |
                                          v              v              v
                                  +---------------------------------------------+
                                  |         Apache Kafka Broker (Port 9092)     |
                                  |    KRaft Mode (No ZooKeeper required)       |
                                  |  - customer-kyc-events                      |
                                  |  - fd-maturity-events                       |
                                  |  - auth-profile-requests-v1 / replies       |
                                  |  - product-catalogue-v1 (Compacted)         |
                                  |  - product-quote-requests-v1 / replies      |
                                  +---------------------------------------------+
                                                         |
         +-----------------------------------------------+-----------------------------------+
         v                                               v                                   v
+-------------------------------+             +-------------------------------+   +-------------------------------+
|  MySQL: authandcust (3306)    |             |    MySQL: fdmodule (3306)     |   | MySQL: banking_product_db(3306|
|  - auth_usr, auth_role        |             |  - fd_accounts, fd_txns       |   |  - product, product_pricing   |
|  - cust_dtl, cust_idfn        |             |  - fd_interest_txns           |   |  - rate_matrix, product_rule  |
|  - cust_addr, login_audit     |             |  - fd_product_catalogue       |   |  - product_charge, audit_log  |
+-------------------------------+             +-------------------------------+   +-------------------------------+
```

---

## ⚡ Service Matrix & Endpoints

| Service / Subsystem | Directory | Port | Database | Primary Health / Swagger URL | Key Capabilities |
|---|---|---|---|---|---|
| **Frontend Web App** | `FRONTEND/` | `4200` | N/A | [http://localhost:4200](http://localhost:4200) | Public landing, calculator, customer dashboard, staff review, officer product maintenance |
| **Auth & Customer Service** | `AUTHMODULET1/auth` | `8080` | `authandcust` | [Swagger UI (8080)](http://localhost:8080/swagger-ui/index.html)<br>[OpenAPI JSON](http://localhost:8080/v3/api-docs) | Identity management, registration, OTP, JWT auth, CIF/KYC management, admin employee creation |
| **Fixed Deposit Service** | `FDMODULET2/` | `8081` | `fdmodule` | [Swagger UI (8081)](http://localhost:8081/swagger-ui/index.html)<br>[Actuator Health](http://localhost:8081/actuator/health) | Financial simulation engine, account creation, interest accrual batch, maturity batch, premature closure, email alerts |
| **Product & Pricing Service** | `PRODUCTMODULET3/product-pricing-service` | `8082` | `banking_product_db` | [Swagger UI (8082)](http://localhost:8082/swagger-ui/index.html)<br>[OpenAPI JSON](http://localhost:8082/v3/api-docs) | Product catalogue CRUD, slab-based rate matrices, category rules (Senior Citizen, Staff), withdrawal penalties |
| **Kafka Broker** | Root / Docker | `9092` | N/A | KRaft Cluster ID: `4L6g3nShT-eMCtK--X86sw` | Event broker for KYC propagation, maturity alerts, and request-reply RPCs between microservices |
| **MySQL Server** | Local / Docker | `3306` | Multi-DB | Root password: `#Iamgood1` (or `rish`) | Relational persistence for customer data, FD accounts, transactions, and product configurations |

---

## 🧩 Subsystem Deep Dives

### 1. Auth & Customer Microservice (`AUTHMODULET1`)

- **Root Directory**: `AUTHMODULET1/auth`
- **Application Class**: `com.example.auth.AuthApplication`
- **Database**: `authandcust` (seeded via `AUTHMODULET1/authandcustDB.sql`)
- **Key Responsibilities**:
  1. **User Authentication & Session Security**:
     - User registration with email/mobile verification via 6-digit OTP (`/auth/register`, `/auth/verify-otp`).
     - Stateless JWT issuance (`/auth/login`) embedding user role claims (`ADMIN`, `STAFF`, `CUSTOMER`).
     - Self-service password reset with OTP verification (`/auth/forgot-password`, `/auth/reset-password`).
     - Token blacklisting and secure logout (`/auth/logout`).
  2. **Customer Information File (CIF) & KYC Management**:
     - Customer master management (`CustDtl`), address components (`CustAddrCmpnt`), contact information (`CustCntctDtls`), and government ID records (`CustIdfn`).
     - Customer verification status progression: `PENDING_VERIFICATION` → `VERIFIED` / `REJECTED`.
  3. **Event Publishing**:
     - Dispatches `KycApprovedEvent` / `KycCustomerEventDto` to Kafka topic `customer-kyc-events` upon successful verification.
  4. **Kafka RPC Responder**:
     - Listens on `auth-profile-requests-v1` to validate customer JWTs and return customer profile details to the Fixed Deposit service over `auth-profile-replies-v1`.

#### Core REST Endpoints (Auth)
- `POST /auth/register` — Initial registration; triggers OTP generation.
- `POST /auth/verify-otp` — Completes registration upon valid OTP input.
- `POST /auth/login` — Authenticates credentials; returns signed JWT.
- `GET  /users/me` — Fetches current user profile and session identity.
- `PUT  /users/me` — Updates user profile details.
- `POST /customer/profile` — Submits KYC profile, documents, and address data.
- `GET  /customer/status` — Retrieves customer verification status.
- `POST /admin/employees` — Admin endpoint to onboard staff/bank officers.

---

### 2. Fixed Deposit Microservice (`FDMODULET2`)

- **Root Directory**: `FDMODULET2/`
- **Application Class**: `com.BankingTech.demo.DemoApplication`
- **Database**: `fdmodule` (auto-updated by Hibernate DDL)
- **Key Responsibilities**:
  1. **Yield Simulation & Financial Calculation Engine**:
     - Utilizes the **Strategy Design Pattern** (`InterestCalculator`, `SimpleInterestCalculator`, `CompoundInterestCalculator`).
     - Supports flexible tenure parameters (Days, Months, Years) and compounding frequencies (`MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `ANNUALLY`).
     - Calculates category bonuses (e.g., Senior Citizen +0.50%, Employee +0.75%) strictly constrained by a regulatory cap (`CATEGORY_CAP = 2.00%`).
     - Performs high-precision mathematical operations using `java.math.BigDecimal` with `RoundingMode.HALF_UP`.
  2. **Account Booking & Product Lifecycle**:
     - Validates applicant KYC eligibility (via `FdCustomerRegistry` synced from Kafka or on-demand via `auth-profile-requests-v1`).
     - Validates deposit terms and fetches authoritative quotes from the Product Pricing module via Kafka (`product-quote-requests-v1`).
     - Generates unique account numbers with prefix `FD...`.
     - Tracks lifecycle states: `ACTIVE`, `PENDING_APPROVAL`, `MATURED`, `PREMATURELY_CLOSED`, `CLOSED`.
  3. **Ledger & Transaction Tracking**:
     - Tracks deposit transactions (`FDTransactionEntity`) and interest posting records (`FDInterestTransactionEntity`).
     - Generates account statements (`FDStatementEntity`).
  4. **Batch Processing Automation**:
     - **Interest Batch Controller** (`/api/fd/batch/interest`): Accrues periodic interest, posts ledger entries, and updates principal for cumulative deposits.
     - **Maturity Batch Controller** (`/api/fd/batch/maturity`): Evaluates accounts reaching maturity, triggers payout calculations, transitions status to `MATURED`, and dispatches `fd-maturity-events` to Kafka.
  5. **Notification Subsystem**:
     - Consumes `fd-maturity-events` from Kafka to dispatch formatted HTML/text email notifications using Spring Mail (`smtp.gmail.com`).

#### Core REST Endpoints (FD)
- `POST /api/fd/calculate` — Simulates FD maturity yield, schedules, and interest breakdowns.
- `POST /api/fd/accounts` — Books a new Fixed Deposit account.
- `GET  /api/fd/accounts` — Lists accounts filtered by authenticated customer or status.
- `GET  /api/fd/accounts/{accountNumber}` — Fetches account details, interest rate, and balance.
- `POST /api/fd/withdraw` — Simulates and executes premature or regular withdrawals with penalty calculations.
- `GET  /api/fd/transactions/{accountNumber}` — Retrieves transaction and interest ledger history.
- `POST /api/fd/batch/interest` — Triggers scheduled interest accrual batch run.
- `POST /api/fd/batch/maturity` — Triggers scheduled maturity processing batch run.
- `GET  /api/fd/products` — Exposes active FD products synced locally from Product module.

---

### 3. Product & Pricing Microservice (`PRODUCTMODULET3`)

- **Root Directory**: `PRODUCTMODULET3/product-pricing-service`
- **Application Class**: `com.bankingtech.product.ProductPricingServiceApplication`
- **Database**: `banking_product_db` (managed via Flyway migrations `V1__init_schema.sql` through `V4__version_product_rules.sql`)
- **Key Responsibilities**:
  1. **Core Banking Product Catalogue**:
     - Manages product master definitions (`Product`, `ProductCharacteristic`, `ProductPricing`).
     - Configures terms (min/max months), allowed transaction types (`DEPOSIT`, `WITHDRAWAL`, `RENEWAL`), currencies (`INR`, `USD`), and allowed customer roles (`OWNER`, `CO_OWNER`, `NOMINEE`).
  2. **Dynamic Tiered Rate Matrix**:
     - Defines rate slabs based on deposit principal ranges and duration intervals (`RateMatrix`).
     - Disallows overlapping rate slabs for the same duration and amount ranges.
  3. **Customer Category Adjustment Rules**:
     - Provides versioned, non-overlapping category bonuses (`ProductRule`) with eligibility criteria (e.g., `SENIOR_CITIZEN` with `minAge = 60`, `EMPLOYEE`).
     - Enforces regulatory rate caps (`rateLimit.max` and `maxAdditionalPercent`).
  4. **Fee & Penalty Administration**:
     - Manages charges (`ProductCharge`, `Charge`) including Tax Deducted at Source (TDS) percentages and premature withdrawal penalty percentages.
  5. **Audit Logging**:
     - Records all create, update, and rule mutations into `product_audit` with timestamp, user ID, and diff details.
  6. **Kafka Integration Bridge**:
     - **Periodic Snapshot Publisher**: Publishes compacted product catalogue snapshots to `product-catalogue-v1` every 5 seconds.
     - **Authoritative Quote Responder**: Listens on `product-quote-requests-v1` and replies on `product-quote-replies-v1` with authoritative effective rates, penalty rules, and compounding specifications for FD account booking.

#### Core REST Endpoints (Product & Pricing)
- `POST /api/product` — Creates a new banking product (Officer/Admin only).
- `GET  /api/product/search` — Paginated and filtered search across product catalogue.
- `GET  /api/product/{productCode}` — Retrieves full product details, charges, and matrices.
- `PUT  /api/product/{productCode}` — Updates product parameters, base rate, or active status.
- `POST /api/product/{productCode}/category-rates` — Adds category adjustment rules.
- `GET  /api/product/{productCode}/effective-rate` — Calculates authoritative rate given principal, term, customer age, and categories.
- `GET  /api/product/{productCode}/validate` — Validates pre-booking product eligibility.
- `GET  /api/product/{productCode}/penalty` — Fetches active withdrawal penalty configuration.
- `GET  /api/product/report/summary` — Officer report summary on active products and rates.

---

### 4. Frontend Web Application (`FRONTEND`)

- **Root Directory**: `FRONTEND/`
- **Technology Stack**: Angular 19+ (Angular 22 CLI & core), TypeScript, RxJS, Vanilla CSS.
- **Reverse Proxy**: Configured via `FRONTEND/proxy.conf.json` to seamlessly route API requests during local development:
  - `/auth/**`, `/customer/**`, `/users/**`, `/admin/**`, `/api/auth/**` → `http://localhost:8080`
  - `/api/fd/**` → `http://localhost:8081`
  - `/api/product/**` → `http://localhost:8082`

#### UI Architecture & Layouts
1. **`AuthLayoutComponent`**:
   - Public-facing shell for guest users.
   - Hosts Landing Page, Login, Registration, OTP Verification, and Forgot Password views.
2. **`DashboardLayoutComponent`**:
   - Authenticated core banking shell with header, sidebar, user profile card, notification toasts, and dark/light theme toggle (`ThemeService`).
   - Dynamic sidebar navigation filtered by user roles.

#### Core Feature Modules
- **`landing/`**: Commercial landing page featuring fixed deposit benefit showcases, interest yield previews, and direct CTA buttons.
- **`auth/`**: Multi-step registration, OTP confirmation dialogs, JWT login, and password recovery.
- **`dashboard/`**: Customer overview of total active deposits, accrued interest to date, recent transactions, and quick action cards.
- **`fixed-deposit/`**:
  - `calculator/`: Interactive yield simulator with sliders for amount, tenure, frequency, and category chips.
  - `create/`: Multi-step account booking wizard utilizing the Kafka-synced product catalogue.
  - `accounts/`: List of open/matured deposits with drill-down into account ledgers, schedules, and premature closure modals.
  - `transactions/`: Real-time transaction history and interest credits.
- **`products/`**: Product catalogue viewer, product creation forms, slab matrix editor, category rule configurator, and rate tester (accessible to `BANK_OFFICER` and `ADMIN`).
- **`admin/`**: Operational control room for manually running interest accrual and maturity batch jobs, audit inspection, and staff management.
- **`reports/`**: FD maturity analysis, portfolio distribution, and yield projections.
- **`customer/` & `user/`**: Profile maintenance, KYC document submission, and verification status display.

#### Interceptors & Guards
- `AuthGuard`: Prevents unauthenticated access to protected routes.
- `RoleGuard`: Enforces role-based route access (`ADMIN`, `BANK_OFFICER`, `STAFF`, `CUSTOMER`).
- `JwtInterceptor`: Automatically injects `Authorization: Bearer <token>` into all outbound HTTP requests.
- `ErrorInterceptor`: Catches HTTP errors (401, 403, 500) and surfaces non-intrusive toast alerts to the user.

---

## 📡 Kafka Event-Driven Architecture

The platform uses Apache Kafka (KRaft mode, cluster ID `4L6g3nShT-eMCtK--X86sw`) on port `9092` to decouple services, guarantee event delivery, and power inter-service request-reply patterns.

```
       [Auth Service]                          [FD Service]                       [Product Service]
              |                                      |                                     |
              |--- customer-kyc-events ------------->| (registers customer)                |
              |                                      |                                     |
              |<-- auth-profile-requests-v1 ---------|                                     |
              |--- auth-profile-replies-v1 --------->| (verifies customer)                 |
              |                                      |                                     |
              |                                      |<-- product-catalogue-v1 ------------| (periodically syncs)
              |                                      |                                     |
              |                                      |--- product-quote-requests-v1 ------>|
              |                                      |<-- product-quote-replies-v1 --------| (authoritative quote)
              |                                      |                                     |
              |                                      |--+                                  |
              |                                      |  | fd-maturity-events               |
              |                                      |<-+ (triggers email alerts)          |
```

### Kafka Topic Catalog

| Topic Name | Producer Service | Consumer Service | Pattern | Purpose & Payload Description |
|---|---|---|---|---|
| `customer-kyc-events` | Auth (`8080`) | Fixed Deposit (`8081`) | Pub / Sub | Broadcasts customer KYC approval events (`KycCustomerEventDto`) so FD caches KYC status in `FdCustomerRegistry`. |
| `auth-profile-requests-v1` | Fixed Deposit (`8081`) | Auth (`8080`) | Request / Reply (RPC) | FD queries Auth to validate access tokens and resolve customer identity during account booking without direct DB coupling. |
| `auth-profile-replies-v1` | Auth (`8080`) | Fixed Deposit (`8081`) | Request / Reply (RPC) | Auth returns resolved customer profile, name, and KYC verification state back to FD. |
| `product-catalogue-v1` | Product (`8082`) | Fixed Deposit (`8081`) | Log Compacted Pub / Sub | Product publishes catalogue snapshots every 5 seconds. FD consumes snapshots and updates `fd_product_catalogue`. |
| `product-quote-requests-v1`| Fixed Deposit (`8081`) | Product (`8082`) | Request / Reply (RPC) | FD requests authoritative pricing quote (principal, term, categories, age) before account creation. |
| `product-quote-replies-v1` | Product (`8082`) | Fixed Deposit (`8081`) | Request / Reply (RPC) | Product returns authoritative base rate, category adjustments, max caps, compounding frequency, and penalties. |
| `fd-maturity-events` | Fixed Deposit (`8081`) | Fixed Deposit (`8081`) | Internal Event Stream | Dispatched by maturity batch job when an FD matures. Consumed by `EmailNotificationServiceImpl` to send customer emails. |
| `auth-customer-report-requests-v1` | Fixed Deposit (`8081`) | Auth (`8080`) | Request / Reply (RPC) | On-demand customer data request for maturity report generation without storing Auth customer data in FD database. |
| `auth-customer-report-replies-v1` | Auth (`8080`) | Fixed Deposit (`8081`) | Request / Reply (RPC) | Auth replies with customer CIF data held in memory only during report rendering. |

---

## 🗄️ Database Schema & Data Tier

The platform uses MySQL 8.0 on port `3306` with three isolated databases:

### 1. `authandcust` Database (Auth & Customer Management)
- **`auth_usr`**: Master user login credentials (email/username, BCrypt hashed passwords, failed login counts, lock status).
- **`auth_role`**: System roles (`ROLE_ADMIN`, `ROLE_STAFF`, `ROLE_CUSTOMER`).
- **`cust_dtl`**: Customer Information File (CIF) master (DOB, nationality, occupation, marital status, customer status).
- **`cust_nme_cmpnt`**: Structured name storage (First, Middle, Last names).
- **`cust_addr_cmpnt`**: Residential and permanent addresses (Line 1, Line 2, City, State, Country, Postal Code).
- **`cust_cntct_dtls`**: Verified email addresses and primary phone numbers.
- **`cust_idfn`**: Government identification documents (PAN, Aadhaar, Passport numbers).
- **`cust_acct`**: Links customers to primary savings/operational bank accounts.
- **`login_audit`**: Audit trail of authentication attempts, IP addresses, and user-agent strings.

### 2. `fdmodule` Database (Fixed Deposit Engine)
- **`fd_accounts`**: Master record of all booked fixed deposits (account number, customer ID, principal amount, tenure, interest rate, interest type, compounding frequency, maturity date, maturity amount, payout frequency, status).
- **`fd_transactions`**: Financial transaction log for deposits, withdrawals, and payouts.
- **`fd_interest_transactions`**: Historical ledger of interest accruals and postings per deposit.
- **`fd_statements`**: Generated periodic statement records.
- **`fd_product_catalogue`**: Local replica of available FD products kept in sync via Kafka `product-catalogue-v1`.
- **`fd_customer_registry`**: Local lookup cache of verified customer identifiers populated via `customer-kyc-events`.
- **`notification_log`**: Log of email and SMS notifications dispatched to customers.
- **`audit_log`**: Administrative and transaction audit log.

### 3. `banking_product_db` Database (Product & Pricing)
- **`product`**: Product definitions (product code, name, product type `FD`, currency, effective dates, status).
- **`product_characteristic`**: Term bounds (min/max months), rate bounds (min/max %), maximum allowed category add-on percent (`maxAdditionalPercent`), default base rate, rate type, frequency.
- **`product_pricing`**: Dynamic base rate and pricing rule definitions.
- **`rate_matrix`**: Tiered slab rules specifying principal ranges, tenure ranges, duration units, and base interest rates.
- **`product_rule`**: Customer category adjustment percentages (e.g. `SENIOR_CITIZEN`, `EMPLOYEE`), eligibility criteria (`minAge`), and effective date ranges.
- **`product_charge`** & **`charge`**: TDS charges, premature withdrawal penalty rules.
- **`product_audit`**: Comprehensive audit log recording actor, action type, product code, and change payload.

---

## 🔒 Security & Role-Based Access Control (RBAC)

### 1. Authentication Mechanism
- **JWT (JSON Web Tokens)**: Issued by the Auth Service upon `/auth/login`.
- **Shared Secret Key**: Configured across microservices via environment variable `AUTH_JWT_SECRET` (fallback development secret: `my-super-secret-key-for-authentication-123456789`).
- **Token Claims**: Contains username (`sub`), issue/expiration dates, and user role (`role`: `ADMIN`, `STAFF`, `BANK_OFFICER`, `CUSTOMER`).

### 2. Authorization Matrix

| Capability / API Scope | Public (Guest) | `CUSTOMER` | `STAFF` / `BANK_OFFICER` | `ADMIN` |
|---|:---:|:---:|:---:|:---:|
| Browse Landing Page & Public FD Simulator | ✅ | ✅ | ✅ | ✅ |
| Register, Verify OTP, Login, Reset Password | ✅ | ✅ | ✅ | ✅ |
| Submit & View Personal KYC Details | ❌ | ✅ | ❌ | ❌ |
| Verify Customer KYC Submissions | ❌ | ❌ | ✅ | ✅ |
| View Personal FD Portfolio & Book Deposits | ❌ | ✅ | ❌ | ❌ |
| Execute Premature / Regular FD Withdrawal | ❌ | ✅ | ❌ | ❌ |
| Search Products & Check Authoritative Pricing | ❌ | ✅ | ✅ | ✅ |
| Create, Update, or Inactivate Products & Rules | ❌ | ❌ | ✅ | ✅ |
| Trigger Batch Interest Accrual / Maturity | ❌ | ❌ | ❌ | ✅ |
| Onboard New Staff / Bank Officers | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Setup, Run & Operational Workflows

### Prerequisites
- **Java**: JDK 17 or higher
- **Node.js**: Node 18+ and `npm`
- **Docker & Docker Compose**: (Recommended for Kafka and MySQL)
- **MySQL Server**: 8.0+ (if running natively)

---

### Option 1: Automated Turnkey Launch (Recommended)

The repository provides launch scripts that automatically verify MySQL and Kafka, seed the database, and launch all backend services and the frontend.

#### On Windows (PowerShell):
```powershell
.\start.ps1
```

#### On macOS / Linux:
```bash
chmod +x start.sh AUTHMODULET1/auth/mvnw FDMODULET2/mvnw
./start.sh
```

#### Stopping All Services:
- **Windows**: `.\stop.ps1`
- **macOS / Linux**: `./stop.sh`

---

### Option 2: Step-by-Step Manual Execution

#### Step 1: Start MySQL and Kafka
```bash
# Start MySQL and Kafka via Docker Compose:
docker compose up -d mysql kafka

# If using local MySQL, initialize the databases:
mysql -u root -p"#Iamgood1" -e "CREATE DATABASE IF NOT EXISTS authandcust; CREATE DATABASE IF NOT EXISTS fdmodule; CREATE DATABASE IF NOT EXISTS banking_product_db;"
mysql -u root -p"#Iamgood1" authandcust < AUTHMODULET1/authandcustDB.sql
```

#### Step 2: Start Auth & Customer Service (Port 8080)
```bash
cd AUTHMODULET1/auth
./mvnw spring-boot:run
# Windows: .\mvnw.cmd spring-boot:run
```
*Health Check*: `http://localhost:8080/swagger-ui/index.html`

#### Step 3: Start Fixed Deposit Service (Port 8081)
```bash
cd FDMODULET2
./mvnw spring-boot:run
# Windows: .\mvnw.cmd spring-boot:run
```
*Health Check*: `http://localhost:8081/actuator/health`

#### Step 4: Start Product & Pricing Service (Port 8082)
```bash
cd PRODUCTMODULET3/product-pricing-service
mvn spring-boot:run
```
*Health Check*: `http://localhost:8082/swagger-ui/index.html`

#### Step 5: Start Angular Frontend (Port 4200)
```bash
cd FRONTEND
npm install
npm start
```
*Access URL*: `http://localhost:4200/`

---

## 🔑 Pre-Seeded Credentials & Testing Persona

Use these accounts to test different permission levels:

| Role | Username / Email | Password | Intended Use Case |
|---|---|---|---|
| **Super Admin** | `bankadmin2026@gmail.com` | `Pass@123` | System administration, batch processing, staff creation, audit reviews |
| **Branch Officer / Staff** | `jack.uat.2026@example.com` | `StaffPass@1` | Customer KYC verification, product creation, pricing rule maintenance |
| **Customer (KYC Verified)** | `ram.uat.2026@example.com` | `Pass@123` | Active customer with verified KYC; booking deposits, withdrawals, portfolio viewing |
| **Customer (Standby)** | `customer1` | `password123` | Fast login for functional simulations and UI testing |

---

## 🛠️ Common Troubleshooting

| Issue / Symptom | Potential Root Cause | Recommended Solution |
|---|---|---|
| `401 Unauthorized` on API call | Missing or expired JWT token | Log in via `/login` or provide `Authorization: Bearer <token>` in Swagger. |
| `403 Forbidden` on `/admin/**` or `/api/product` | Insufficient role permissions | Ensure you are logged in with an `ADMIN` or `BANK_OFFICER` account. |
| FD Account Creation fails or times out (12s) | Kafka broker unreachable or Product Pricing service down | Ensure Kafka is listening on port `9092` and `product-pricing-service` is running on `8082`. |
| Product Catalogue empty in FD Booking UI | Snapshot topic not yet consumed | Verify `product-catalogue-v1` topic exists and Product service has published snapshots (runs every 5s). |
| Customer KYC status shows unverified | KYC event not consumed by FD | Approve customer in Auth service, which dispatches `customer-kyc-events` to sync FD module. |
| MySQL connection refused (`port 3306`) | Database service stopped or wrong credentials | Verify MySQL credentials match `DB_USERNAME` (`root`) and `DB_PASSWORD` (`#Iamgood1` or `rish`). |
