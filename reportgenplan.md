# FD Maturity Report – Auth Customer Data and Report Generation Plan

## Objective

Create a post-maturity FD report containing:

- Customer information owned by Auth.
- FD account and product information owned by FD.
- Complete interest and transaction history.
- Final maturity payout and notification status.

The Auth customer response is requested on demand through Kafka. FD must not persist the Auth customer response in a customer table or customer cache.

## High-level flow

```text
FD report request
      |
      | 1. Load FD account and transaction data
      |
      | 2. Request customer details from Auth
      v
auth-customer-report-requests-v1
      |
      v
Auth reads its own customer tables
      |
      v
auth-customer-report-replies-v1
      |
      v
FD receives customer data in memory
      |
      v
Combine Auth response + FD data
      |
      v
Generate JSON/PDF report and return it to the caller
```

The customer response should remain in memory only for the duration of report generation. Do not save it to `fd_customer_registry` or any new FD customer table.

## Kafka contract

### Request topic

```text
auth-customer-report-requests-v1
```

Request DTO:

```text
com.example.auth.dto.CustomerReportRequestEvent
com.BankingTech.demo.dto.CustomerReportRequestEvent
```

Payload:

```json
{
  "schemaVersion": 1,
  "correlationId": "uuid",
  "customerId": 10,
  "expiresAt": 1792345678000
}
```

Rules:

- `schemaVersion` must equal `1`.
- `correlationId` is required and must be unique per request.
- `customerId` is required.
- `expiresAt` is an epoch-millisecond expiry time.
- Auth must ignore expired or malformed requests.
- The request must not contain a password, JWT, or other credential.

### Reply topic

```text
auth-customer-report-replies-v1
```

Reply DTO:

```text
com.example.auth.dto.CustomerReportResponseEvent
com.BankingTech.demo.dto.CustomerReportResponseEvent
```

Successful payload shape:

```json
{
  "schemaVersion": 1,
  "correlationId": "uuid",
  "valid": true,
  "status": 200,
  "message": "Customer details returned",
  "customer": {
    "customerId": 10,
    "fullName": "Customer Name",
    "dateOfBirth": "1990-05-10",
    "gender": "FEMALE",
    "customerTypeCode": "INDIVIDUAL",
    "customerTypeName": "Individual",
    "classificationType": "CUSTOMER_CATEGORY",
    "classificationValue": "SENIOR_CITIZEN",
    "customerStatus": "ACTIVE",
    "kycStatus": "ACTIVE",
    "preferredLanguage": "ENGLISH",
    "countryOfOrigin": "INDIA",
    "email": "customer@example.com",
    "contacts": [
      {
        "type": "MOBILE",
        "value": "+91XXXXXXXXXX"
      }
    ],
    "addresses": [
      {
        "type": "PERMANENT",
        "value": "Customer address"
      }
    ],
    "identifications": [
      {
        "type": "PAN",
        "maskedValue": "XXXXXX1234"
      }
    ]
  }
}
```

Failure payload:

```json
{
  "schemaVersion": 1,
  "correlationId": "uuid",
  "valid": false,
  "status": 404,
  "message": "Customer not found",
  "customer": null
}
```

## Auth-side work

Implement an Auth Kafka service similar to `AuthProfileKafkaService`.

### Topic configuration

Add the two topics to Auth Kafka configuration:

```text
auth-customer-report-requests-v1
auth-customer-report-replies-v1
```

Recommended local-development settings:

- One partition.
- One replica.
- Short retention, for example 60 seconds.
- `auto.offset.reset=latest`.
- Manual offset acknowledgement or the existing error-handler convention.
- Do not log request or reply payloads because they contain personal data.

Use a dedicated consumer group:

```text
auth-customer-report-service-v1
```

### Auth consumer behavior

1. Deserialize and validate the request.
2. Reject unsupported schema versions.
3. Reject missing correlation ID or customer ID.
4. Reject expired requests.
5. Load customer data from Auth tables.
6. Load related records:
   - `cust_dtl`
   - `cust_typ_mstr`
   - `cust_cl`
   - `cust_sts_mstr`
   - `cust_idfn`
   - `cust_nme_cmpnt`, if the canonical name is stored there
   - `cust_addr_cmpnt`
   - `cust_cntct_dtls`
   - Auth user record for registered email, where applicable
7. Map the result to `CustomerReportResponseEvent.Customer`.
8. Mask identification values before publishing.
9. Publish the reply using the original correlation ID as the Kafka key.
10. Return `404` if the customer does not exist.
11. Return `409` or `422` if the customer exists but required KYC/status information is unavailable.

Auth remains the source of truth. Do not write any customer data to FD as part of this flow.

## FD-side work

Implement a report Kafka client similar to `FdAuthKafkaClient`.

### FD request behavior

1. Receive a report request for an FD account number.
2. Load the FD account from `fd_accounts`.
3. Obtain the customer ID from `fd_account_customer_id`.
4. Generate a correlation ID.
5. Put a `CompletableFuture<CustomerReportResponseEvent>` in an in-memory pending-request map.
6. Publish `CustomerReportRequestEvent` to `auth-customer-report-requests-v1`.
7. Wait for the matching reply, with a timeout of approximately 12 seconds.
8. Match replies only by correlation ID.
9. Remove the pending request in a `finally` block.
10. Never save the customer response in a repository.
11. Return `503` if Auth/Kafka is unavailable.
12. Return an appropriate report error if Auth returns an invalid customer response.

Use a dedicated reply consumer group. For multiple FD instances, use the existing correlation-map pattern, but make sure the reply consumer group allows every FD instance that may own a pending request to receive the reply. Do not use a shared group that can route a reply to an instance that does not have the matching in-memory future.

## Report data composition

The report generator should combine the Auth response with the following FD data.

### Customer section

Use the Auth response only in memory:

- Customer ID
- Full name
- Date of birth
- Gender
- Customer type
- Customer classification
- Customer status
- KYC status
- Preferred language
- Country of origin
- Email
- Contact details
- Addresses
- Masked identification details

### FD account section

Read from `fd_accounts`:

- FD account number
- Customer ID
- Product code
- Currency
- Principal amount
- Contracted interest rate
- Term
- Opening date/time
- Maturity date
- Interest type
- Interest payout type
- Interest frequency
- Account status
- Closed date/time
- Accrued interest, if still available

### Interest section

Read from `fd_interest_transactions`:

- Interest transaction ID
- Interest amount
- Interest date
- Interest status
- Audit fields required for traceability

Order interest records by date ascending in the report.

### Transaction section

Read from `fd_transactions`:

- Transaction ID
- Transaction type
- Transaction date/time
- Amount
- Penalty amount
- Remarks
- User/system ID
- Rule/system ID
- Audit UUID
- Acceptance timestamp

Expected transaction types include:

```text
DEPOSIT
INTEREST_CREDIT
PREMATURE_WITHDRAWAL
PENALTY
MATURITY_PAYOUT
ADJUSTMENT
```

Order transactions by transaction date ascending.

### Maturity section

Identify the maturity settlement from the `MATURITY_PAYOUT` transaction and include:

- Maturity processing date
- Gross maturity payout
- Principal component
- Interest component
- Penalty/deduction amount
- Net payout
- Account closed date/time
- Maturity transaction ID

The maturity service currently creates a `MATURITY_PAYOUT` transaction and closes the account. Do not rely only on `fd_account_accrued_interest`, because the maturity process resets that field after payout.

### Notification section

Read from `notifications_log`:

- Notification ID
- Notification type
- Channel
- Masked recipient
- Notification status
- Sent timestamp
- Failure message, if any
- Maturity amount
- Maturity date

## Report endpoint

Suggested endpoint:

```text
GET /api/fd/reports/maturity/{fdAccountNo}
```

Recommended behavior:

- Verify the caller is authorized to view the FD account.
- Load the FD account and related FD records.
- Request customer data from Auth through Kafka.
- Generate the report in memory.
- Return JSON initially; add PDF rendering after the JSON contract is stable.
- Do not persist the Auth customer response.

Possible response envelope:

```json
{
  "reportType": "FD_MATURITY",
  "reportGeneratedAt": "2026-10-20T12:00:00Z",
  "customer": {},
  "fdAccount": {},
  "interestTransactions": [],
  "transactions": [],
  "maturity": {},
  "notifications": []
}
```

## Important consistency checks

The report must fail rather than produce a misleading result when:

- The FD account does not exist.
- The account belongs to a different customer than the Auth response.
- Auth returns `valid=false`.
- The FD account is not matured or closed, unless the endpoint explicitly supports preview reports.
- No `MATURITY_PAYOUT` transaction exists for a closed maturity account.
- The maturity payout is less than the expected principal plus valid interest after deductions.
- Kafka/Auth times out.

The report should clearly distinguish:

- Normal maturity.
- Premature withdrawal.
- Failed or pending maturity processing.

## Security and privacy

- Do not log Kafka payloads.
- Do not log customer addresses, contact values, or identification values.
- Mask PAN/Aadhaar/other identity values before Auth publishes them.
- Do not transmit passwords, access tokens, refresh tokens, or login audit secrets.
- Apply authorization before returning the report.
- Do not store the Auth reply in FD tables, cache, or an outbox.
- Avoid putting sensitive customer data in Kafka headers.

## Tests required

### Auth tests

- Valid customer request returns all expected fields.
- Unknown customer returns `valid=false` and `404`.
- Expired request produces no reply.
- Unsupported schema version is rejected.
- Identification values are masked.
- Auth does not log the payload.

### FD tests

- FD sends the correct customer ID from `fd_accounts`.
- FD matches the correct reply by correlation ID.
- FD times out cleanly when Auth/Kafka is unavailable.
- FD does not persist the customer response.
- FD rejects a reply for the wrong customer.
- Report includes initial deposit and maturity payout.
- Report includes all interest and transaction records in chronological order.
- Report includes notification status.
- Report cannot be generated for an unrelated or unauthorized FD account.

## Definition of done

- Both Kafka topics are created by application configuration.
- Auth consumes requests and publishes replies using the DTO contract.
- FD requests customer data only when generating the report.
- No Auth customer data is written to an FD customer table.
- JSON maturity report is available through the FD endpoint.
- Report contains customer, account, interest, transaction, maturity, and notification sections.
- Timeout, invalid customer, mismatched customer, and malformed message cases are tested.
- Auth and FD Maven builds and tests pass.
