# Product Pricing Backend Implementation Plan

## Goal

Complete the Product & Pricing backend described in `DOCS/MANUAL.docx` (L5 and L9), with the category pricing and base-rate interface required by the FD Calculator in L6. Keep frontend work out of this phase. Preserve existing data and unrelated changes elsewhere in the repository.

## Initial baseline before implementation

- The Spring Boot service has a MySQL/Flyway schema, reference seeds, ten JPA entities, and entity enums.
- At the start of this work, the controller, DTO, service, repository, security, and exception packages contained only package descriptions; no Product API was implemented.
- `FDMODULET2` still accepts the base rate and category adjustments directly in its calculator request. Its account API carries `productCode` and an interest rate, so Product Pricing must expose stable product-code and effective-rate lookups for later integration.
- The Auth service issues signed JWTs with a `role` claim. Its current filter does not populate authorities, so Product Pricing must validate the same token contract and enforce roles locally. Keep the signing secret configurable and document that both services need the same value.
- Preserve unrelated existing repo changes. The Auth JWT signing-key configuration is the only change outside `PRODUCTMODULET3`, because both services need the same configurable secret to integrate securely.

## Phases and subphases

### Phase 1 — Requirements and contracts

1. Map L5 create, search, and update requirements to endpoint behavior and DTO fields.
2. Map L6 base rate, customer-category adjustments, cap, and effective-rate needs to Product Pricing data and API contracts.
3. Map L9 authentication and `BANK_OFFICER` / `ADMIN` authorization requirements.
4. Compare Product, Auth, and FD module conventions and record integration assumptions.

**Exit evidence:** API contract, field validation rules, role matrix, and cross-module lookup contract are documented.

### Phase 2 — Persistence foundation

1. Reconcile entity mappings with the active Flyway schema and seed data.
2. Add Spring Data repositories and query methods for product code, product type/date search, active pricing, interest rates, and category rules.
3. Resolve duplicate/stale enum and schema artifacts only where they cause ambiguity or build/runtime risk; preserve existing database meaning.

**Exit evidence:** repository layer compiles and queries can express the endpoint filters without loading unrelated data.

### Phase 3 — Product API and business rules

1. Add validated request/response DTOs for create, detail, search, update, pricing, and category-rate operations.
2. Implement product creation, duplicate-code handling, product type resolution, term/rate bounds, effective dates, and default values.
3. Implement detail-by-code and filtered, paginated product search.
4. Implement product maintenance with partial-update semantics and consistent date/range validation.
5. Add category-rate add/list operations and effective-rate calculation: apply eligible category adjustments once, combine them deterministically, and enforce the configured maximum cap.
6. Expose calculator-friendly lookups for base/effective rates and supported categories without requiring direct database access.

**Exit evidence:** the manual's examples are representable end to end; invalid inputs and missing products return consistent client errors.

### Phase 4 — Security, errors, and API documentation

1. Add stateless JWT validation compatible with Auth's signed token, including signature/expiry validation and subject/role claim extraction.
2. Require `BANK_OFFICER` or `ADMIN` for product/pricing mutations; permit authenticated customer/staff reads and quotes needed by the frontend calculator. Return 401 for unauthenticated and 403 for disallowed roles.
3. Add centralized validation, not-found, conflict, and unexpected-error responses without leaking internals.
4. Publish OpenAPI documentation with endpoints, role requirements, parameters, examples, and error responses.

**Exit evidence:** role behavior is enforced at runtime and the documented API matches controller behavior.

### Phase 5 — Integration readiness and verification

1. Confirm Product code, date, currency, term, base-rate, and category-rate fields line up with FD account/calculator needs.
2. Build the service and run the existing database constraint checks where the required MySQL environment is available.
3. Review each manual requirement against implementation evidence and document any environment-dependent verification that could not be completed.
4. Provide frontend handoff details: base URL, auth header, endpoints, DTO examples, and local run configuration.

**Exit evidence:** successful build, requirement-by-requirement review, and frontend integration contract.

## Acceptance checklist

- [x] L5: create, search/filter, detail, and update product APIs with API documentation and examples.
- [x] Product persistence covers the manual's product metadata, terms, rate bounds, charges, and effective dates.
- [x] L6: base-rate and category-rate lookup supports calculator integration; stacked adjustments obey the configured cap.
- [x] L9: valid JWT required; product/pricing mutations are restricted to `BANK_OFFICER` / `ADMIN`, while customer/staff read and quote access supports the integrated calculator.
- [x] Validation and error responses are consistent and do not expose internal exception details.
- [x] Service builds; schema mappings and existing SQL constraints remain compatible.
- [x] Frontend product maintenance and FD quote flows call Product Pricing through the local proxy and attach Auth JWTs.

## Handoff state (2026-10-16)

### Completed and verified

- Phase 1: mapped manual L5/L6/L9 requirements and checked Auth/FD contracts. `productCode` is the FD Account external key. Auth access tokens use `sub`, `userId`, and `role` claims.
- Phase 2: implemented repositories and validated entity mappings against both a clean Flyway database and the standalone Workbench schema.
- Phase 3: implemented seven Product APIs: create, search, detail, update, add/list category rates, and effective-rate calculation. Validation covers duplicate products/categories, product term bounds, rate-matrix overlap, date/rate limits, age/gender qualifications, and category caps. Product data includes charges, customer roles, transaction types, term/rate bounds, effective dates, base rates, and rate matrices.
- Phase 4: implemented stateless JWT signature/expiry validation, subject/role mapping, URL and method role checks, structured errors, OpenAPI docs, and audit events. Auth and Product both read `AUTH_JWT_SECRET`; the existing development fallback remains for local use.
- `mvn -q clean package` passed in `product-pricing-service` against disposable MySQL. This includes the context-load test, Flyway V1/V2/V3, and Hibernate validation.
- Fresh-schema run applied all three migrations. A pre-created Workbench schema baselined at V1, applied V2/V3, and passed Hibernate validation.
- `database/constraint_tests.sh` passed all 48 assertions against both the Flyway schema and standalone schema.
- 23 backend HTTP checks passed before frontend wiring: all seven operations, JWT expiry and validation, role enforcement, duplicate conflicts, term and age checks, rate-matrix overlap rejection, effective-rate cap behavior, legacy demo-seed compatibility, OpenAPI operation count, and Auth-compatible signing. After the read/quote role scope changed for frontend integration, fresh runtime checks separately confirmed customer/staff reads and quotes, customer mutation 403s, missing-token 401, officer writes, and CORS.
- The optional demo seed script ran twice successfully and its tiered rate was selected by the effective-rate API. Product create/update/category audit rows were confirmed in MySQL.
- Auth compiled successfully with `mvn -q -DskipTests package` after changing `JwtService` to read the same `AUTH_JWT_SECRET` environment variable; its full application test was not run because it targets the separate Auth database.
- Frontend now has typed Product Pricing API models/service, a staff-only catalogue and category-rate management screen, dynamic product selection for FD creation, effective-rate driven calculator quotes, and `/api/product` proxy routing.
- Product read and quote endpoints permit authenticated `CUSTOMER` and `STAFF` roles so the frontend calculator can use live pricing; create/update/category-rate mutations remain restricted to `BANK_OFFICER` and `ADMIN`.
- `start.sh` launches Product Pricing on port 8082 with the same database credentials as the other local services.
- Angular production build passed. Product service `mvn -q clean test` passed against a fresh disposable MySQL 8 database, applying Flyway migrations and Hibernate validation. `bash -n start.sh`, proxy JSON parsing, and `git diff --check` passed.
- Build outputs and disposable MySQL data are local verification artifacts; existing unrelated repository changes were preserved.

### Remaining integration boundary

- A full browser-based session against live Auth, FD, and Product services has not been run. Product service context-load, schema migration, build, and Angular production build are verified; deployment still requires all services to share the same `AUTH_JWT_SECRET` and the configured MySQL credentials.
- For deployment, set the same strong value of at least 32 UTF-8 bytes in `AUTH_JWT_SECRET` for Auth and Product. Do not use the local fallback.
