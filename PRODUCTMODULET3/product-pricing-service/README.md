# Product and Pricing Service

Spring Boot backend for the Banking Technology Lab Product & Pricing module (manual Labs L5, L6 integration contract, and L9 security). It provides product maintenance/search APIs, product charges, base-rate lookup, and customer-category rate adjustments. All `/api/**` routes require a valid Auth-module JWT. Product reads and effective-rate quotes are available to `CUSTOMER`, `STAFF`, `BANK_OFFICER`, and `ADMIN`; product and pricing mutations require `BANK_OFFICER` or `ADMIN`.

## Run locally

Requirements: Java 17+, Maven, and MySQL 8.0.16+.

1. Start MySQL and set `DB_USERNAME` / `DB_PASSWORD` if they differ from the local defaults.
2. Run `mvn spring-boot:run` from this folder. Flyway applies V1/V2/V3 and Hibernate validates entity mappings. Service listens on port 8082.
3. Obtain a JWT from the Auth service. For local integration, the product service's `AUTH_JWT_SECRET` must match the Auth service signing secret. The fallback value is only for local development; configure a shared secret through environment variables in a deployed environment.
4. Open `/swagger-ui/index.html` for interactive API documentation or `/v3/api-docs` for OpenAPI JSON. The root `start.ps1` and `start.sh` launch this service together with Auth, FD, Kafka, MySQL, and Angular.

## Authentication and roles

Send `Authorization: Bearer <JWT>` with every product API call. The service verifies the signature and expiration, reads the Auth service's `role` claim, and maps it to a Spring Security role. `CUSTOMER`, `STAFF`, `BANK_OFFICER`, and `ADMIN` can read products and request effective-rate quotes. Only `BANK_OFFICER` and `ADMIN` can create/update products or add category rates. Missing/invalid credentials receive 401, and authenticated roles outside those rules receive 403. Product create/update/category-rule operations persist the authenticated username, action, product code, and action details in `product_audit`.

Auth and Product Pricing both read `AUTH_JWT_SECRET`. If it is unset, each uses the existing development fallback so the local Auth token contract remains compatible. For deployment, set the same strong secret of at least 32 UTF-8 bytes in both services; do not use the fallback.

Set `PRODUCT_CORS_ALLOWED_ORIGINS` to pipe-separated trusted origin patterns for the deployed frontend. The default permits localhost development origins only.

## Frontend integration

The Angular app proxies `/api/product/**` to `http://localhost:8082`; the shared JWT interceptor attaches the Auth access token. Bank officers and admins can open `/products` from **Products & Pricing** to create, search, update, and inactivate products and add dated category-rate rules. The page shows a catalogue summary and provides **Check pricing** for account eligibility, effective-rate quotes, and configured withdrawal charges. Sign in through the running Auth service; the frontend's existing offline/demo sessions cannot authenticate to this backend.

FD account creation now uses Kafka integration described below. The separate FD calculator and withdrawal flows are not yet connected to Product pricing.

## Kafka integration with FD account creation

Product publishes committed catalogue snapshots to `product-catalogue-v1` every five seconds, keyed by product code. The topic is compacted with one partition. Periodic reconciliation automatically includes existing products and retries after broker outages without relying on an in-memory change notification. FD persists snapshots in `fd_product_catalogue`, ignores duplicate/older offsets, and exposes active, currently effective FD products through `/api/fd/products`. The account form refreshes this catalogue every ten seconds. FD booking and reporting support both INR and JPY products.

For pricing, FD sends a correlated request over `product-quote-requests-v1` and receives the authoritative answer over `product-quote-replies-v1`. The form displays the selected product's term/rate limits, charges, current rate, interest type, and compounding frequency. Amount/tenure changes request a new quote. `ANNUALLY` maps to FD's `ANNUAL`. Payout frequency remains a separate choice because the product has no payout-frequency field. Category bonuses are not automatically inferred for account creation.

Both FD creation endpoints revalidate pricing through Kafka and replace browser-supplied rate/type/frequency with the authoritative values. Invalid or inactive products and unavailable pricing prevent creation. Requests time out after twelve seconds; no default rate is substituted. Keep Auth, FD, Product, and Kafka running.

The previous FD-to-Auth HTTP verification has also been replaced by `auth-profile-requests-v1` / `auth-profile-replies-v1`. Auth validates the token and resolves the profile; FD preserves ownership and KYC checks. These request/reply topics have short retention and requests expire after fifteen seconds. Configure Kafka ACLs and encrypted broker transport for deployments; access-token messages must not be logged. Frontend HTTP calls to each owning backend remain normal UI API calls; backend-to-backend integration uses Kafka.

FD's existing Hibernate schema-update setting creates the catalogue table. Product requires no new schema migration for this integration. New products persist interest type/frequency even without a base rate; older tier-only products without those stored settings use the established compound/quarterly defaults until updated.

Product records are not inserted by the reference-data migrations. After a fresh database setup, a bank officer or admin should create an active FD product in Products & Pricing before using Check pricing. Tiered products can be configured in the product form; include a base rate when a fallback is wanted.

## Merged API additions

- `GET /api/product/report/summary`: officer/admin-only product counts and available base-rate statistics. Active counts reflect the stored status; rate statistics use today's available base rates.
- `GET /api/product/{productCode}/validate?termMonths=12&amount=50000&currency=INR`: checks active dates/status, positive amount and term, term bounds, currency when supplied, and availability of an applicable rate. Invalid eligibility returns `valid: false` with a reason; it never invents a fallback rate.
- `GET /api/product/{productCode}/penalty`: returns currently effective configured withdrawal charges. An absent penalty percentage is `null`, not an assumed 1%. This endpoint reports configuration; it does not calculate a withdrawal payout.
- `GET /api/health`: public application liveness probe. It is not a database-readiness check.
- Category adjustments support non-overlapping date versions for the same category code. Dates are inclusive: a new version must start after the previous version ends. The UI includes optional effective-to dates.
- Explicit JSON `null` clears a product description or effective-to date; omitting those properties preserves them.

## Migration and verification

Migrations V1–V3 are unchanged. V4 changes the product-rule unique key to `(product_id, rule_code, effective_from)` without deleting product rows. It runs automatically on the next backend startup. Back up an existing product database before upgrading. `database/preflight_category_rule_overlaps.sql` is a read-only overlap check. Unsupported legacy schemas fail with a diagnostic instead of silently rewriting data.

Run `mvn test` for the offline suite. To include the live MySQL startup test, set `LIVE_DB_TEST=true` and point `SPRING_DATASOURCE_URL` at a disposable test database, with `DB_USERNAME` and `DB_PASSWORD` set appropriately. Never point migration tests at a database containing user data.

Local defaults remain compatible with Auth. The optional `prod` profile requires explicit `AUTH_JWT_SECRET`, `DB_HOST`, `DB_USERNAME`, and `DB_PASSWORD` and uses certificate-verified MySQL TLS. Configure the same JWT secret in Auth and Product. No demo dashboard or token-issuing helper was merged.

## API contract

### Create product

`POST /api/product` — returns 201 and a `Location` header.

```json
{
  "productCode": "FD001",
  "productName": "Fixed Deposit - Short Term",
  "productType": "FD",
  "currency": "INR",
  "effectiveDate": "2026-10-15",
  "termLimit": { "min": 3, "max": 36 },
  "rateLimit": { "min": 5.0, "max": 8.5 },
  "maxAdditionalPercent": 2.0,
  "baseRate": 6.5,
  "rateType": "COMPOUND",
  "frequency": "QUARTERLY",
  "charges": [
    { "chargeCode": "TDS", "calculationType": "PERCENTAGE", "percentage": 10.0 }
  ],
  "allowedCustomerRoles": ["OWNER", "CO_OWNER", "NOMINEE"],
  "transactionTypes": ["DEPOSIT", "WITHDRAWAL", "RENEWAL"],
  "rateMatrix": [
    {
      "minAmount": 1000,
      "maxAmount": 100000,
      "durationFrom": 3,
      "durationTo": 6,
      "durationUnit": "MONTHS",
      "rate": 6.5,
      "effectiveFrom": "2026-10-15"
    }
  ]
}
```

`baseRate` is optional so the manual's sample payload without it remains valid. A product without a configured base rate can be created and searched, but rate lookup returns 404 until a base rate is supplied through product maintenance.

### Search and retrieve

- `GET /api/product/search?productType=FD&startDate=2026-01-01&endDate=2026-12-31&page=0&size=20&status=ACTIVE`
- `GET /api/product/{productCode}`

Search returns `{ "content": [...], "page": 0, "size": 20, "totalElements": 1, "totalPages": 1 }`. Page size is limited to 100. Date filters apply to product `effectiveDate`.

### Maintain product

`PUT /api/product/{productCode}` accepts fields to change. For example:

```json
{
  "productName": "Fixed Deposit - Premium",
  "rateLimit": { "min": 5.0, "max": 8.5 },
  "baseRate": 6.75
}
```

The base rate must remain within the configured rate limits. Product codes and product types are immutable after creation. Products are inactivated with `status: "INACTIVE"`, not physically deleted.

### Category rates and effective-rate calculation

- `POST /api/product/{productCode}/category-rates`
- `GET /api/product/{productCode}/category-rates?date=2026-10-15`
- `GET /api/product/{productCode}/effective-rate?principal=50000&term=6&termUnit=MONTHS&categories=SENIOR_CITIZEN&categories=EMPLOYEE&customerAge=65&customerGender=F&date=2026-10-15`

Create category adjustment:

```json
{
  "categoryCode": "SENIOR_CITIZEN",
  "displayName": "Senior citizen",
  "adjustmentPercent": 1.0,
  "minAge": 60,
  "effectiveFrom": "2026-10-15"
}
```

When a product has a tiered rate matrix, the quote request must include `principal`, `term`, and `termUnit`; the service selects the effective matrix row matching the amount and the same duration unit. Product term limits are stored in months; day-based quotes are normalized using 30 days per month and year-based quotes using 12 months per year. Overlapping matrix rows that could match the same amount, term, unit, and date are rejected. If no matrix row matches, the service falls back to an active base rate. It then adds each selected category exactly once, honors the product's configured `maxAdditionalPercent` (or an active `RATE_CAP` rule when that characteristic is not set), and caps the final rate at `rateLimit.max`. Age-qualified rules require `customerAge`; gender-qualified rules require `customerGender`. Both checks reject customers outside the configured criteria. `totalAdjustmentPercent` is the adjustment actually applied after both caps.

Example response:

```json
{
  "productCode": "FD001",
  "baseRate": 6.5,
  "totalAdjustmentPercent": 2.0,
  "effectiveRate": 8.5,
  "rateCap": 8.5,
  "additionalRateCap": 2.0,
  "capped": true,
  "appliedCategories": ["SENIOR_CITIZEN", "EMPLOYEE"]
}
```

## Error response

API validation and business errors use a consistent JSON shape. Typical statuses are 400 (invalid request/filter), 401 (missing or invalid JWT), 403 (wrong role), 404 (unknown product/rate), 409 (duplicate product/category/constraint conflict), 422 (product not active or configuration unsuitable), and 500 (unexpected server error).

```json
{
  "timestamp": "2026-10-15T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "path": "/api/product",
  "validationErrors": { "productCode": "must not be blank" }
}
```

## Data model and integration notes

- Flyway `V1__init_schema.sql` is the core schema migration; `V2__seed_reference_data.sql` creates product types and charge masters; `V3__product_audit.sql` adds a durable actor/action audit table. Product limits and allowed customer roles are typed product characteristics. Category rates are stored as `CATEGORY_PRICING` product rules.
- `src/main/resources/db/seed_data.sql` is an optional demo-data script for a Flyway-created database. It replaces the `FD001` and `SB001` demo product rows, so do not run it where those codes contain user data.
- The FD Account module stores `productCode`; that remains the stable external product key. Calculator integrations should use the effective-rate endpoint instead of treating category adjustments as trusted client-supplied numbers.
- `database/banking_product_db.sql` is a standalone MySQL setup script. `database/constraint_tests.sh` covers core schema constraints and requires a running MySQL database.

## Verification

Merge verification (2026-10-17), using a separate disposable MySQL database:

- All 45 backend tests passed with `LIVE_DB_TEST=true`, including migrations V1–V4 and Hibernate schema validation. The production-secret regression test was rerun after rejecting the existing development signing-key fallback in production.
- Angular production build passed.
- A browser session with an actual Auth-module admin login created a product through Angular and retrieved a 7.5% effective rate from a 6.5% base rate plus a 1% age-qualified bonus.
- Live API checks through the frontend proxy accepted non-overlapping category versions and rejected overlapping versions with HTTP 409. Nonpositive amount validation and absent penalty configuration were checked against the test database.

The existing product database was not migrated during initial merge verification. Subsequent account-creation integration uses Kafka as described above; withdrawal integration is separate. The standalone SQL constraint script was not rerun for this merge.
