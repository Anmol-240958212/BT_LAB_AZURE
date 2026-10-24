# Product Pricing Module

The runnable backend project is in [`product-pricing-service/`](product-pricing-service/). Build and run that Maven project; its Flyway migrations under `product-pricing-service/src/main/resources/db/migration/` are the active schema source of truth.

The files named `01_*`, `02_*`, and `03_Product.java` in this folder are earlier standalone drafts. They are not compiled by the Maven project. Do not use their schema, enum, or entity definitions to change the running service. The standalone Workbench script maintained for the active service is `product-pricing-service/database/banking_product_db.sql`.

See [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for phase status and outstanding runtime verification, and [`product-pricing-service/README.md`](product-pricing-service/README.md) for API examples, local configuration, and the frontend integration contract.
