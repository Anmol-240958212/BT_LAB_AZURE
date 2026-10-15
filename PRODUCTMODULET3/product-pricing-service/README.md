# Product and Pricing Service

Spring Boot backend for the Banking Technology Lab Product & Pricing module (manual Labs L5, L6 integration contract, and L9 security). It provides product maintenance/search APIs, product charges, base-rate lookup, and customer-category rate adjustments. All `/api/**` routes require a valid Auth-module JWT. Product reads and effective-rate quotes are available to `CUSTOMER`, `STAFF`, `BANK_OFFICER`, and `ADMIN`; product and pricing mutations require `BANK_OFFICER` or `ADMIN`.

## Run locally

Requirements: Java 17+, Maven, and MySQL 8.0.16+.

1. Start MySQL and set `DB_USERNAME` / `DB_PASSWORD` if they differ from the local defaults.
2. Run `mvn spring-boot:run` from this folder. Flyway applies V1/V2/V3 and Hibernate validates entity mappings. Service listens on port 8082.
3. Obtain a JWT from the Auth service. For local integration, the product service's `AUTH_JWT_SECRET` must match the Auth service signing secret. The fallback value is only for local development; configure a shared secret through environment variables in a deployed environment.
4. Open `/swagger-ui/index.html` for interactive API documentation or `/v3/api-docs` for OpenAPI JSON. `start.sh` starts this service on port 8082 alongside Auth, FD, and the Angular app.

## Authentication and roles

Send `Authorization: Bearer <JWT>` with every product API call. The service verifies the signature and expiration, reads the Auth service's `role` claim, and maps it to a Spring Security role. `CUSTOMER`, `STAFF`, `BANK_OFFICER`, and `ADMIN` can read products and request effective-rate quotes. Only `BANK_OFFICER` and `ADMIN` can create/update products or add category rates. Missing/invalid credentials receive 401, and authenticated roles outside those rules receive 403. Product create/update/category-rule operations persist the authenticated username, action, product code, and action details in `product_audit`.

Auth and Product Pricing both read `AUTH_JWT_SECRET`. If it is unset, each uses the existing development fallback so the local Auth token contract remains compatible. For deployment, set the same strong secret of at least 32 UTF-8 bytes in both services; do not use the fallback.

Set `PRODUCT_CORS_ALLOWED_ORIGINS` to pipe-separated trusted origin patterns for the deployed frontend. The default permits localhost development origins only.

## Frontend integration

The Angular app proxies `/api/product/**` to `http://localhost:8082`; the shared JWT interceptor attaches the Auth access token. Bank officers and admins can open `/products` to create, search, update, and inactivate products and add category-rate rules. The FD calculator loads active FD products and category rules, asks this service for the final effective rate using the selected product, amount, term, and customer profile, then sends that quoted rate to the FD calculation endpoint. FD account creation also loads active products and refreshes the quote when the amount, term, or product changes.

Product records are not inserted by the reference-data migrations. After a fresh database setup, a bank officer or admin should create an active FD product in Products & Pricing before a live calculator quote or FD account can be created. Tiered products can be configured in the product form; include a base rate when a fallback is wanted.

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

Verification completed against a disposable MySQL 8 database:

- `mvn -q clean package` passed, including the context-load test, Flyway migrations, and Hibernate schema validation.
- `database/constraint_tests.sh` passed all 48 database assertions against both the Flyway schema and the standalone Workbench schema.
- Runtime checks exercised all seven API operations, JWT and role outcomes, duplicate requests, term/age validation, matrix selection/overlap rejection, category-rate capping, legacy seed-data compatibility, audit persistence, and the OpenAPI document.
- After frontend integration, live HTTP checks against a fresh Product database confirmed customer/staff product reads, a customer category-adjusted quote, officer product/category writes, 401 for missing credentials, 403 for customer mutations, and CORS permission for `http://localhost:4200`.

The Angular production build and Product Pricing context-load test have been checked after the frontend wiring. A live browser session through the full Auth + FD + Product stack has not been run as part of these checks; the product API contract and proxy configuration are documented above.
