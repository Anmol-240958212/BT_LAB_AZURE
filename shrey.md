# 🎯 Shrey's Master Presentation & Viva Defense Guide
## Banking Technology Lab (CSF 3142) — vaultOne Core Banking System
### Group 12: Fixed Deposit (FD) Module

---

## 📌 1. Your Role & Official Responsibilities

According to the official project work split (`worksplit.xlsx` - **GROUP 12**), you are **Shrey**, and your designated contributions are:

| Topic | Specific Task / Deliverable | Key Components & Files |
|---|---|---|
| **1. Simulation Engine** | **Simulation API** | `FDCalculatorController.java` (`POST /api/fd/calculate`), `FDCalculatorService.java` |
| **1. Simulation Engine** | **Interest Simulation** | `SimpleInterestCalculator.java`, `CompoundInterestCalculator.java`, `InterestCalculator.java` (Strategy Pattern) |
| **1. Simulation Engine** | **Effective Rate Calculation** | `FDCalculatorServiceImpl.java` (Base Rate + Category Bonus + `CATEGORY_CAP = 2.0%` validation) |
| **2. Role Based Service Access** | **Role Authorization** | Angular `RoleGuard`, `app-routing.module.ts`, `AppSidebarComponent` (Role filtering for CUSTOMER, BANK_OFFICER, ADMIN) |
| **2. Role Based Service Access** | **Ownership Checks** | Data isolation in `FixedDepositAccountServiceImpl` (`getAccountsByCustomer(customerId)`) & profile ownership |

---

## ⏱️ 2. The Winning 5-Minute Presentation Game Plan

When the teacher calls you or walks up to your screen, do **not** sound confused or say "I'm not sure". Deliver this crisp, structured sequence:

```
[0:00 - 0:45]  Elevator Pitch: Introduce your exact modules & architectural responsibilities.
[0:45 - 2:00]  Live API Demonstration: Run test scenarios in Swagger UI & Postman (Show Simple, Compound & Rate Cap validation).
[2:00 - 3:15]  Frontend Demonstration: Show the live FD Calculator UI, Category add-ons, Comparison matrix, and Role-Based dynamic menu.
[3:15 - 4:00]  Architecture & DB: Explain the Strategy Pattern, BigDecimal precision, and how simulation feeds into account booking.
[4:00 - 5:00]  Role-Based Access & Ownership: Explain route guarding and customer data isolation.
```

### 🗣️ Your Opening Script (Say this verbatim):
> *"Good morning Sir / Ma'am. In Group 12 for the Fixed Deposit module, I was responsible for the **Financial Simulation Engine** and **Role-Based Service Access & Customer Ownership**.
>
> My engine allows prospective customers and bank officers to simulate maturity yields under both Simple and Compound interest rules, calculates effective rates with customer category adjustments (like Senior Citizen and Employee benefits) with strict regulatory capping, and feeds validated rate parameters directly into account creation.
>
> Let me first show you the backend API running on Swagger and Postman, and then walk you through the live UI and architecture."*

---

## 🚀 3. System Startup & Quick Access Links

Before presenting, ensure all three services are running.

### How to start (Terminal in `/Users/shreyvashistha/Desktop/BTLAB`):
```bash
./start.sh
```
*(On Windows: `.\start.ps1`)*

### Your Key URLs (Open these in Chrome tabs beforehand):
- **FD Service Swagger UI (Your Primary Backend)**: [http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html)
- **Frontend FD Calculator**: [http://localhost:4200/fixed-deposit/calculator](http://localhost:4200/fixed-deposit/calculator)
- **Frontend Commercial Landing Page**: [http://localhost:4200/](http://localhost:4200/)
- **Auth Service Swagger UI**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- **FD Microservice Health Check**: [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health)

---

## 📬 4. Postman Demonstration: Exact Steps & Payloads

Open Postman, create a collection named `FD Simulation Engine - Shrey`, and execute these test cases in front of the teacher:

---

### Test Case 1: Standard Compound Interest Calculation (Normal Case)
- **Endpoint**: `http://localhost:8081/api/fd/calculate`
- **Method**: `POST`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Body (Raw JSON)**:
  ```json
  {
    "principal": 100000.00,
    "term": {
      "value": 12,
      "unit": "MONTHS"
    },
    "baseRate": 7.10,
    "categories": [
      "Senior Citizen"
    ],
    "interestType": "COMPOUND"
  }
  ```
- **Expected Status**: `200 OK`
- **Expected Response**:
  ```json
  {
    "maturityAmount": 108407.41,
    "effectiveRate": 8.1000,
    "interestEarned": 8407.41
  }
  ```
- **What to tell the teacher**:
  > *"Here, the base rate was 7.10%. The user is a Senior Citizen, so the engine dynamically added a +1.00% category bonus, yielding an effective rate of 8.1000%. Under monthly compounding for 12 months, the principal of ₹1,00,000 earns ₹8,407.41 in interest, giving a maturity value of ₹1,08,407.41."*

---

### Test Case 2: Simple Interest Calculation (Linear Accrual)
- **Endpoint**: `http://localhost:8081/api/fd/calculate`
- **Method**: `POST`
- **Request Body (Raw JSON)**:
  ```json
  {
    "principal": 100000.00,
    "term": {
      "value": 12,
      "unit": "MONTHS"
    },
    "baseRate": 7.10,
    "categories": [],
    "interestType": "SIMPLE"
  }
  ```
- **Expected Status**: `200 OK`
- **Expected Response**:
  ```json
  {
    "maturityAmount": 107100.00,
    "effectiveRate": 7.1000,
    "interestEarned": 7100.00
  }
  ```
- **What to tell the teacher**:
  > *"When the customer chooses Simple Interest, the engine invokes the SimpleInterestCalculator strategy. For ₹1,00,000 at 7.10% for 1 year, the linear interest is exactly ₹7,100.00, yielding ₹1,07,100.00."*

---

### Test Case 3: Category Bonus Cap Exceeded (Business Rule Validation)
- **Endpoint**: `http://localhost:8081/api/fd/calculate`
- **Method**: `POST`
- **Request Body (Raw JSON)**:
  ```json
  {
    "principal": 50000.00,
    "term": {
      "value": 24,
      "unit": "MONTHS"
    },
    "baseRate": 6.50,
    "categories": [
      "Senior Citizen",
      "Employee",
      "Special Benefit"
    ],
    "interestType": "COMPOUND"
  }
  ```
- **Expected Status**: `400 Bad Request` or `500 Internal Error` (Throws `IllegalArgumentException`)
- **Error Message Content**:
  ```
  "Combined category rate exceeds configured cap"
  ```
- **What to tell the teacher**:
  > *"Notice how the system protects bank profitability. The code enforces a `CATEGORY_CAP = 2.0%`. If multiple stacked category additions exceed 2.0%, the service immediately throws an exception and refuses calculation."*

---

### Test Case 4: Input Bean Validation (@Valid & Constraints)
- **Endpoint**: `http://localhost:8081/api/fd/calculate`
- **Method**: `POST`
- **Request Body (Raw JSON)**:
  ```json
  {
    "principal": -5000.00,
    "term": {
      "value": 0,
      "unit": "MONTHS"
    },
    "baseRate": -2.0,
    "interestType": ""
  }
  ```
- **Expected Status**: `400 Bad Request`
- **What to tell the teacher**:
  > *"All inputs are validated at the DTO layer using Jakarta Bean Validation (`@DecimalMin`, `@Positive`, `@NotBlank`). Invalid principals, non-positive tenures, or negative interest rates are rejected before reaching business logic."*

---

## 🌐 5. Swagger UI Demonstration (Live Interactive API Docs)

1. Open **[http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html)** in your browser.
2. Scroll to the **`fd-calculator-controller`** section.
3. Click on **`POST /api/fd/calculate`**.
4. Click the **"Try it out"** button on the top right of the box.
5. In the Request body field, paste:
   ```json
   {
     "principal": 200000,
     "term": {
       "value": 24,
       "unit": "MONTHS"
     },
     "baseRate": 7.25,
     "categories": ["Employee"],
     "interestType": "COMPOUND"
   }
   ```
6. Click the blue **"Execute"** button.
7. Show the teacher:
   - **Response Code**: `200`
   - **Response Body**:
     - `effectiveRate`: `8.25`
     - `maturityAmount`: `235655.85`
     - `interestEarned`: `35655.85`
   - **Curl command** generated automatically by Swagger.

---

## 💻 6. Frontend UI Demonstration: Screens & Walkthrough

Open the Angular web application at **[http://localhost:4200](http://localhost:4200)**.

### Screen 1: Dedicated FD Calculator (`/fixed-deposit/calculator`)
Navigate to **Fixed Deposit -> FD Calculator** in the sidebar (or [http://localhost:4200/fixed-deposit/calculator](http://localhost:4200/fixed-deposit/calculator)):
1. **Show Deposit Parameters Panel**:
   - Change Deposit Principal to **₹ 1,00,000**.
   - Change Term Duration to **12 Months**.
   - Change Base Rate to **7.10%**.
   - Toggle between **Compound Interest (Quarterly Compounding)** and **Simple Interest**.
2. **Show Category Add-ons**:
   - Check **Senior Citizen (+0.50%)** — observe rate change to 7.60%.
   - Check **Bank Employee (+1.00%)** — observe rate change to 8.60%, and point out the **"Regulatory Rate Cap Applied" warning banner** (Hard cap at 8.50%!).
3. **Show Maturity Projection & Side-by-Side Comparison Matrix**:
   - Point out the **ESTIMATED MATURITY VALUE** in big numerals.
   - Point out the bottom comparison box showing **Simple Interest Yield** vs **Compound Interest Yield** side-by-side.
4. **Show Seamless Journey to Account Booking**:
   - Click **"Open FD Account With These Terms →"**.
   - Show how the parameters (principal, term, effective rate, interest type) are automatically routed into the FD creation form as query parameters!

---

### Screen 2: Commercial Landing Page (`/`)
Navigate to [http://localhost:4200/](http://localhost:4200/):
- Scroll down to the **Interactive Yield Calculator widget**.
- Demonstrate the sliders and presets (₹50k, ₹1L, ₹5L, ₹10L).
- Explain: *"We made yield simulation publicly accessible so prospective customers can preview earnings before committing capital."*

---

### Screen 3: Role-Based Access Control (RBAC) Demonstration
Show how the application dynamically secures features based on user roles:

| Step | User / Role | Credentials | What to Show in UI |
|---|---|---|---|
| **A** | **Public User (Logged Out)** | None | Can access Landing Page and FD Calculator. Protected routes like `/dashboard` redirect to `/login`. |
| **B** | **Customer** | `ram.uat.2026@example.com` / `Pass@123` | Sidebar shows: **"My Fixed Deposits"**, **"FD Calculator"**, **"My KYC Profile"**. Administrative menus like "Batch Operations" and "Create FD Account" are **completely hidden**. |
| **C** | **Unauthorized Check** | Manually type `/admin` in address bar while logged in as Customer | Instantly intercepted by Angular `RoleGuard` and redirects to the styled **`/unauthorized`** page! |
| **D** | **Bank Officer / Admin** | `bankadmin2026@gmail.com` / `Pass@123` | Sidebar now unlocks: **"Create FD Account"**, **"FD Accounts (All)"**, **"Transactions"**, **"Customer KYC & Accounts"**, **"Batch Operations"**, and **"Analytics & Reports"**. |

---

## 🗄️ 7. Database Schema & Architectural Deep Dive

If the teacher asks: *"Where is this stored in the database?"* or *"Show me the entities"*:

### 1. Why the Simulation Engine is Stateless
- **Design Decision**: The simulation engine is **intentionally stateless**. Prospective depositors simulate dozens of scenarios with different rates, tenures, and amounts. Writing every draft simulation to the database would cause severe database write bloat.
- **Integration with Persistence**: Once the customer is satisfied with the simulated terms and applies for the deposit, the validated simulation parameters are written to the **`fd_accounts`** table in database **`banking_tech2`**.

### 2. Relevant Database Schema (`banking_tech2` Database)
Table: **`fd_accounts`** (Mapped to `FixedDepositAccountEntity.java`):

```sql
CREATE TABLE `fd_accounts` (
  `fd_account_no` VARCHAR(30) NOT NULL PRIMARY KEY,
  `fd_account_customer_id` VARCHAR(30) NOT NULL,
  `fd_account_product_code` VARCHAR(30) NOT NULL,
  `fd_account_principal` DECIMAL(19, 2) NOT NULL,    -- From Simulation Principal
  `fd_account_rate` DECIMAL(7, 4) NOT NULL,          -- From Effective Rate Engine
  `fd_account_term` INT NOT NULL,                    -- Term in Months
  `fd_account_interest_type` VARCHAR(20) NOT NULL,   -- COMPOUND or SIMPLE
  `fd_account_interest_frequency` VARCHAR(20) NOT NULL, -- MONTHLY, QUARTERLY, etc.
  `fd_account_interest_payout_type` VARCHAR(20) NOT NULL, -- ACCRUE or CAPITALIZE
  `fd_account_accrued_interest` DECIMAL(19, 2) NOT NULL,
  `fd_account_status` VARCHAR(30) NOT NULL,          -- ACTIVE, CLOSED, etc.
  `fd_account_opened_at` DATETIME NOT NULL,
  `fd_account_maturity_date` DATE NOT NULL,
  -- Enterprise Audit Columns (from AuditEntity)
  `fd_account_crud_value` CHAR(1),
  `fd_account_user_id` VARCHAR(100),
  `fd_account_ws_id` VARCHAR(100),
  `fd_account_uuid` BINARY(16)
);
```

### 3. Design Pattern in Code: Strategy Pattern
Show the teacher the code files in:
`FDMODULET2/src/main/java/com/BankingTech/demo/service/plugins/calculator/`

- **Interface**: `InterestCalculator.java`
- **Concrete Strategy 1**: `SimpleInterestCalculator.java`
- **Concrete Strategy 2**: `CompoundInterestCalculator.java`
- **Context**: `FDCalculatorServiceImpl.java` and `InterestCalculationServiceImpl.java`

**Why this is good engineering**:
Adheres to the **Open/Closed Principle (OCP)**. If the bank introduces a new calculation mechanism (e.g., Daily Compounding or Step-Up Interest), we simply implement a new `InterestCalculator` class without altering existing controller or database code.

---

## ❓ 8. Teacher Viva Q&A (Top 12 Questions & Exact Answers)

### Q1: What was your specific contribution to this project?
> **Answer**: *"I was responsible for two major deliverables in Group 12:
> 1. The **Financial Simulation Engine**, which includes the `POST /api/fd/calculate` REST endpoint, the implementation of both Simple and Compound interest mathematical models using the Strategy Pattern, and dynamic effective rate calculations with category bonuses and regulatory cap enforcement.
> 2. The **Role-Based Service Access and Customer Ownership** architecture, including client-side route guards, dynamic role-based UI rendering, and customer-scoped account access."*

---

### Q2: Why did you use `BigDecimal` instead of `double` or `float` in your backend?
> **Answer**: *"In financial systems, floating-point numbers (`float` and `double`) use binary representation (IEEE 754), which causes precision errors during rounding and compounding (e.g., `0.1 + 0.2 = 0.30000000000000004`).
> For banking systems, regulatory standards require exact decimal arithmetic. We use `BigDecimal` with explicit scale and `RoundingMode.HALF_UP` to guarantee that interest and maturity figures are accurate to the exact cent/paisa."*

---

### Q3: How is Compound Interest calculated in your engine?
> **Answer**: *"In `CompoundInterestCalculator.java`, we calculate monthly compounding:
>
> $$\text{monthlyRate} = \frac{\text{annualRate}}{12 \times 100}$$
> $$\text{Maturity} = \text{Principal} \times (1 + \text{monthlyRate})^{\text{termMonths}}$$
> $$\text{Interest} = \text{Maturity} - \text{Principal}$$
>
> It rounds to 2 decimal places with `RoundingMode.HALF_UP`."*

---

### Q4: How is Simple Interest calculated?
> **Answer**: *"In `SimpleInterestCalculator.java`, we convert months into fractional years:
>
> $$\text{termYears} = \frac{\text{termMonths}}{12}$$
> $$\text{Interest} = \frac{\text{Principal} \times \text{annualRate} \times \text{termYears}}{100}$$
>
> This is used for linear accruals or short-tenure products."*

---

### Q5: What happens if a customer qualifies for multiple categories (e.g., Senior Citizen + Staff)?
> **Answer**: *"In `FDCalculatorServiceImpl.java`, the system calculates cumulative bonus additions (+1.00% for Senior Citizen, +1.00% for Staff). However, we have a hard-coded security rule `CATEGORY_CAP = BigDecimal.valueOf(2.0)`. If the cumulative addition exceeds 2.0%, the service rejects the request with an `IllegalArgumentException` ('Combined category rate exceeds configured cap'). In the frontend, we also apply a regulatory ceiling of 8.50% p.a."*

---

### Q6: Why did you design the Simulation API as a stateless service?
> **Answer**: *"Customers frequently tweak sliders, test tenures, and simulate different deposit options before making a decision. Making the simulation API stateless prevents database thrashing and unnecessary storage overhead. Once the user finalizes the simulation, those parameters are passed to `FixedDepositAccountController` (`POST /api/fd/account/create-with-txn`) to persist the confirmed deposit."*

---

### Q7: How does Role-Based Access Control (RBAC) work across the system?
> **Answer**: *"RBAC is enforced in two complementary layers:
> 1. **Frontend**: Angular `RoleGuard` inspects the decoded JWT role claim (`CUSTOMER`, `BANK_OFFICER`, `ADMIN`). Unauthorized routes trigger immediate redirection to `/unauthorized`. Furthermore, `AppSidebarComponent` filters menu options so sensitive features like 'Batch Operations' or 'Create FD Account' are only visible to authorized personnel.
> 2. **Backend**: Spring Security (`SecurityConfig`) is structured to enforce `@PreAuthorize("hasAnyRole('BANK_OFFICER', 'ADMIN')")` on administrative endpoints like interest calculation batches."*

---

### Q8: How did you implement Customer Ownership checks?
> **Answer**: *"In `FixedDepositAccountServiceImpl.java`, we have `getAccountsByCustomer(String customerId)`. When a logged-in customer views their fixed deposits, queries are filtered strictly by their authenticated `customerId`. A customer cannot view or withdraw another customer's FD account. Full cross-customer access is restricted to `BANK_OFFICER` and `ADMIN` roles."*

---

### Q9: What design patterns did you employ in this codebase?
> **Answer**:
> - **Strategy Pattern**: Decoupling the interest calculation algorithms (`SimpleInterestCalculator` and `CompoundInterestCalculator`) behind the `InterestCalculator` interface.
> - **DTO (Data Transfer Object) Pattern**: Separating domain entities (`FixedDepositAccountEntity`) from client requests (`FDCalculationRequestDTO`, `FixedDepositAccountRequestDTO`) to prevent over-posting and control serialization.
> - **Inheritance / Layer Supertype**: `AuditEntity` provides standardized audit columns (`userId`, `hostTs`, `localTs`, `uuid`) across all database entities."*

---

### Q10: How does your calculation logic connect with Dhruv's Interest Accrual Batch Engine?
> **Answer**: *"The batch engine (`InterestCalculationServiceImpl.java`) processes periodic interest accruals and compounding for all active accounts. It injects the same `SimpleInterestCalculator` and `CompoundInterestCalculator` beans that I built for the simulation engine, ensuring mathematical consistency between what the customer was quoted during simulation and what the batch ledger posts to `fd_interest_transactions`."*

---

### Q11: What validation annotations did you use on the DTOs?
> **Answer**:
> - `@NotNull`: Ensures required fields are present.
> - `@DecimalMin(value = "0.01")`: Ensures principal is greater than zero.
> - `@Positive`: Ensures term value is a positive integer.
> - `@NotBlank`: Ensures mandatory string fields (like `interestType`) are not empty.
> - `@Valid`: Triggers cascading validation on nested objects like `TermDTO`."*

---

### Q12: Why did `FDMODULET2/src/main/java/com/BankingTech/demo/config/SecurityConfig.java` have `permitAll()` during initial testing?
> **Answer**: *"During Phase 1 development, Group 1 (Auth & JWT team) and Group 2 (FD team) developed microservices concurrently. To enable independent testing and Swagger/Postman integration before JWT coordination was finalized, the FD microservice allowed open access for local development. In production, JWT filter validation is enabled, matching the Auth module's JWT tokens."*

---

## 📋 9. Final Pre-Presentation Checklist (Do this 10 mins before class)

- [ ] Run `./start.sh` and ensure all 3 services start without errors.
- [ ] Open Chrome with 3 pinned tabs:
  1. `http://localhost:4200/fixed-deposit/calculator` (Frontend Calculator)
  2. `http://localhost:8081/swagger-ui/index.html` (FD Swagger UI)
  3. `http://localhost:4200/login` (Login screen for demonstrating Customer vs Admin roles)
- [ ] Open Postman with the 4 payloads saved and ready to send.
- [ ] Have `FDCalculatorController.java`, `FDCalculatorServiceImpl.java`, and `CompoundInterestCalculator.java` open in VS Code in case the teacher asks to inspect the code.
- [ ] Take a deep breath — you know your modules inside-out, and everything is fully implemented and tested! 🚀
