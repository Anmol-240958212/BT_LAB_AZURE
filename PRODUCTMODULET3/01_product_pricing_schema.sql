-- =====================================================================
--  Product & Pricing Module  —  Database Schema
--  Banking Technology Lab (CSF 3142) · Lab L5 · Group 8
--
--  Database : banking_product_db
--  Engine   : MySQL 8.0.16+  (CHECK constraints are only enforced from 8.0.16)
--  Tables   : 10
--             Product module ...... product_type_master, product,
--                                   product_characteristic, product_rule
--             Pricing module ...... product_pricing, interest_rate, rate_matrix
--             Charges ............. charge, product_charge
--             Communication ....... product_notification
--
--  HOW TO RUN (MySQL Workbench): File > Open SQL Script > this file >
--  Execute (Ctrl+Shift+Enter). The script is re-runnable: it drops and
--  recreates ONLY the 10 module tables below.
--
--  Every table has a named PRIMARY KEY, every relationship is a real
--  FOREIGN KEY, every business identifier has a UNIQUE constraint, and
--  every fixed vocabulary / numeric range is enforced with CHECK.
--  Java enums in com.bankingtech.product.enums mirror the CHECK lists
--  one-to-one, so the application and the database agree on legal values.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS banking_product_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE banking_product_db;

-- ---------------------------------------------------------------------
--  Clean slate for the module's own tables (children first, then parents)
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS product_notification;
DROP TABLE IF EXISTS product_charge;
DROP TABLE IF EXISTS charge;
DROP TABLE IF EXISTS rate_matrix;
DROP TABLE IF EXISTS interest_rate;
DROP TABLE IF EXISTS product_pricing;
DROP TABLE IF EXISTS product_rule;
DROP TABLE IF EXISTS product_characteristic;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS product_type_master;
SET FOREIGN_KEY_CHECKS = 1;

-- OPTIONAL — only if the older 4-table version of this module (plus its
-- Flyway history) still exists in this database. Uncomment to remove it.
-- DROP TABLE IF EXISTS product_category_rates;
-- DROP TABLE IF EXISTS product_roles;
-- DROP TABLE IF EXISTS product_charges;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS flyway_schema_history;


-- =====================================================================
--  1. PRODUCT MODULE
-- =====================================================================

-- ---------------------------------------------------------------------
--  1.1  product_type_master  — master list of product families
--       (FD = Fixed Deposit, RD = Recurring Deposit, SB = Savings, ...)
-- ---------------------------------------------------------------------
CREATE TABLE product_type_master (
    product_type_id  BIGINT        NOT NULL AUTO_INCREMENT,
    type_code        VARCHAR(30)   NOT NULL,
    type_name        VARCHAR(100)  NOT NULL,
    description      VARCHAR(255)  NULL,

    CONSTRAINT pk_product_type_master   PRIMARY KEY (product_type_id),
    CONSTRAINT uk_product_type_master   UNIQUE      (type_code)
) ENGINE = InnoDB
  COMMENT = 'Master data: the families of products the bank offers';


-- ---------------------------------------------------------------------
--  1.2  product  — one row per sellable product (FD001, SB001, ...).
--       Every account in the bank is opened against exactly one product.
-- ---------------------------------------------------------------------
CREATE TABLE product (
    product_id       BIGINT        NOT NULL AUTO_INCREMENT,
    product_code     VARCHAR(30)   NOT NULL,                  -- business key used by the FD / Calculator groups
    product_name     VARCHAR(100)  NOT NULL,
    product_type_id  BIGINT        NOT NULL,
    description      VARCHAR(255)  NULL,
    currency_code    CHAR(3)       NOT NULL DEFAULT 'INR',    -- ISO-4217; L5 payload field "currency"
    status           VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    effective_from   DATE          NOT NULL,                  -- L5 payload field "effectiveDate"
    effective_to     DATE          NULL,                      -- NULL = open-ended
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product               PRIMARY KEY (product_id),
    CONSTRAINT uk_product_code          UNIQUE      (product_code),
    INDEX      idx_product_type_effective (product_type_id, effective_from),   -- serves the FK + /api/product/search
    INDEX      idx_product_status        (status),
    CONSTRAINT fk_product_type          FOREIGN KEY (product_type_id)
                                        REFERENCES product_type_master (product_type_id)
                                        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_product_status       CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'RETIRED')),
    CONSTRAINT chk_product_currency     CHECK (REGEXP_LIKE(currency_code, '^[A-Z]{3}$', 'c')),   -- 'c' = case-sensitive (the default collation is case-insensitive)
    CONSTRAINT chk_product_effective    CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'Banking products; accounts are derived from these';


-- ---------------------------------------------------------------------
--  1.3  product_characteristic  — EAV table.
--       Each product attribute (MIN_TERM_MONTHS, MAX_AMOUNT, PENALTY_PERCENT,
--       INTEREST_TYPE ...) is a ROW here, not a column, so new attributes
--       never need an ALTER TABLE. data_type says which value_* column holds
--       the value, and a CHECK guarantees that column is actually filled.
-- ---------------------------------------------------------------------
CREATE TABLE product_characteristic (
    characteristic_id    BIGINT         NOT NULL AUTO_INCREMENT,
    product_id           BIGINT         NOT NULL,
    characteristic_name  VARCHAR(100)   NOT NULL,    -- e.g. MIN_TERM_MONTHS, MAX_TERM_MONTHS, MIN_AMOUNT, MAX_AMOUNT, MIN_RATE, MAX_RATE, PREMATURE_PENALTY_PERCENT, INTEREST_TYPE
    data_type            VARCHAR(20)    NOT NULL,    -- TEXT | NUMBER | PERCENTAGE | AMOUNT
    value_text           VARCHAR(255)   NULL,
    value_number         DECIMAL(18,4)  NULL,
    value_percentage     DECIMAL(8,4)   NULL,
    value_amount         DECIMAL(18,2)  NULL,
    currency_code        CHAR(3)        NULL,        -- mandatory when data_type = AMOUNT
    effective_from       DATE           NOT NULL,
    effective_to         DATE           NULL,
    created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_characteristic       PRIMARY KEY (characteristic_id),
    CONSTRAINT uk_characteristic_product_name  UNIQUE      (product_id, characteristic_name, effective_from),
    INDEX      idx_characteristic_name         (characteristic_name),
    CONSTRAINT fk_characteristic_product       FOREIGN KEY (product_id)
                                               REFERENCES product (product_id)
                                               ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_characteristic_data_type    CHECK (data_type IN ('TEXT', 'NUMBER', 'PERCENTAGE', 'AMOUNT')),
    CONSTRAINT chk_characteristic_value        CHECK (
           (data_type = 'TEXT'       AND value_text       IS NOT NULL)
        OR (data_type = 'NUMBER'     AND value_number     IS NOT NULL)
        OR (data_type = 'PERCENTAGE' AND value_percentage IS NOT NULL)
        OR (data_type = 'AMOUNT'     AND value_amount     IS NOT NULL AND currency_code IS NOT NULL)
    ),
    CONSTRAINT chk_characteristic_effective    CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'EAV attributes of a product (term limits, amount limits, penalties, ...)';


-- ---------------------------------------------------------------------
--  1.4  product_rule  — business rules too rich for a key/value row:
--       eligibility, premature-withdrawal, and CATEGORY_PRICING rules
--       (senior citizen / employee / age / gender adjustments) whose
--       parameters live as JSON in rule_definition.
-- ---------------------------------------------------------------------
CREATE TABLE product_rule (
    rule_id          BIGINT        NOT NULL AUTO_INCREMENT,
    product_id       BIGINT        NOT NULL,
    rule_code        VARCHAR(30)   NOT NULL,           -- unique within a product, e.g. SENIOR_BONUS
    rule_name        VARCHAR(100)  NOT NULL,
    rule_type        VARCHAR(50)   NOT NULL,           -- CATEGORY_PRICING | ELIGIBILITY | EARLY_WITHDRAWAL | RATE_CAP ...
    rule_definition  TEXT          NULL,               -- JSON, e.g. {"category":"SENIOR_CITIZEN","minAge":60,"adjustmentPercent":0.50}
    effective_from   DATE          NOT NULL,
    effective_to     DATE          NULL,
    status           VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_rule          PRIMARY KEY (rule_id),
    CONSTRAINT uk_rule_product_code     UNIQUE      (product_id, rule_code),
    INDEX      idx_rule_type            (rule_type),
    CONSTRAINT fk_rule_product          FOREIGN KEY (product_id)
                                        REFERENCES product (product_id)
                                        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_rule_status          CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_rule_definition_json CHECK (rule_definition IS NULL OR JSON_VALID(rule_definition)),
    CONSTRAINT chk_rule_effective       CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'Business rules per product, incl. category-based pricing rules as JSON';


-- =====================================================================
--  2. PRICING MODULE
-- =====================================================================

-- ---------------------------------------------------------------------
--  2.1  product_pricing  — a pricing "plan" attached to a product for a
--       period. Its base rate lives in interest_rate; its tiered rates
--       live in rate_matrix.
-- ---------------------------------------------------------------------
CREATE TABLE product_pricing (
    pricing_id       BIGINT        NOT NULL AUTO_INCREMENT,
    product_id       BIGINT        NOT NULL,
    pricing_type     VARCHAR(30)   NOT NULL,           -- STANDARD | PROMOTIONAL | TIERED
    effective_from   DATE          NOT NULL,
    effective_to     DATE          NULL,
    status           VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_pricing        PRIMARY KEY (pricing_id),
    CONSTRAINT uk_pricing_product_type   UNIQUE      (product_id, pricing_type, effective_from),
    CONSTRAINT fk_pricing_product        FOREIGN KEY (product_id)
                                         REFERENCES product (product_id)
                                         ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_pricing_type          CHECK (pricing_type IN ('STANDARD', 'PROMOTIONAL', 'TIERED')),
    CONSTRAINT chk_pricing_status        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_pricing_effective     CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'Pricing plan of a product for a validity period';


-- ---------------------------------------------------------------------
--  2.2  interest_rate  — the base (card) rate of a pricing plan.
--       COMPOUND rates must say how often they compound.
-- ---------------------------------------------------------------------
CREATE TABLE interest_rate (
    interest_rate_id BIGINT        NOT NULL AUTO_INCREMENT,
    pricing_id       BIGINT        NOT NULL,
    rate             DECIMAL(8,4)  NOT NULL,           -- percent per annum, e.g. 6.5000
    rate_type        VARCHAR(30)   NOT NULL,           -- SIMPLE | COMPOUND
    frequency        VARCHAR(30)   NULL,               -- MONTHLY | QUARTERLY | HALF_YEARLY | ANNUALLY (compounding)
    effective_from   DATE          NOT NULL,
    effective_to     DATE          NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_interest_rate           PRIMARY KEY (interest_rate_id),
    CONSTRAINT uk_interest_rate_pricing   UNIQUE      (pricing_id, effective_from),
    CONSTRAINT fk_interest_rate_pricing   FOREIGN KEY (pricing_id)
                                          REFERENCES product_pricing (pricing_id)
                                          ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_interest_rate_range    CHECK (rate >= 0 AND rate <= 100),
    CONSTRAINT chk_interest_rate_type     CHECK (rate_type IN ('SIMPLE', 'COMPOUND')),
    CONSTRAINT chk_interest_rate_freq     CHECK (frequency IS NULL OR frequency IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY')),
    CONSTRAINT chk_interest_compound_freq CHECK (rate_type = 'SIMPLE' OR frequency IS NOT NULL),
    CONSTRAINT chk_interest_rate_effective CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'Base interest rate of a pricing plan';


-- ---------------------------------------------------------------------
--  2.3  rate_matrix  — tiered rates by amount band × duration band, e.g.
--       "3–6 months on ₹1,000–₹1 crore earns 5.50%". The FD Calculator
--       (L6) looks up the applicable row for principal + term.
-- ---------------------------------------------------------------------
CREATE TABLE rate_matrix (
    rate_matrix_id   BIGINT         NOT NULL AUTO_INCREMENT,
    pricing_id       BIGINT         NOT NULL,
    min_amount       DECIMAL(18,2)  NOT NULL,
    max_amount       DECIMAL(18,2)  NOT NULL,
    duration_from    INT            NOT NULL,          -- inclusive
    duration_to      INT            NOT NULL,          -- inclusive
    duration_unit    VARCHAR(20)    NOT NULL,          -- DAYS | MONTHS | YEARS
    rate             DECIMAL(8,4)   NOT NULL,          -- percent per annum
    effective_from   DATE           NOT NULL,
    effective_to     DATE           NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_rate_matrix            PRIMARY KEY (rate_matrix_id),
    CONSTRAINT uk_rate_matrix_band       UNIQUE      (pricing_id, min_amount, duration_from, duration_unit, effective_from),
    INDEX      idx_rate_matrix_lookup    (pricing_id, duration_unit, duration_from, min_amount),
    CONSTRAINT fk_rate_matrix_pricing    FOREIGN KEY (pricing_id)
                                         REFERENCES product_pricing (pricing_id)
                                         ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_rate_matrix_amount    CHECK (min_amount >= 0 AND min_amount <= max_amount),
    CONSTRAINT chk_rate_matrix_duration  CHECK (duration_from >= 0 AND duration_from <= duration_to),
    CONSTRAINT chk_rate_matrix_unit      CHECK (duration_unit IN ('DAYS', 'MONTHS', 'YEARS')),
    CONSTRAINT chk_rate_matrix_rate      CHECK (rate >= 0 AND rate <= 100),
    CONSTRAINT chk_rate_matrix_effective CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'Tiered interest rates by amount band and duration band';


-- =====================================================================
--  3. CHARGES
-- =====================================================================

-- ---------------------------------------------------------------------
--  3.1  charge  — master catalogue of charges (TDS, withdrawal fee, ...)
-- ---------------------------------------------------------------------
CREATE TABLE charge (
    charge_id     BIGINT        NOT NULL AUTO_INCREMENT,
    charge_code   VARCHAR(30)   NOT NULL,
    charge_name   VARCHAR(100)  NOT NULL,
    charge_type   VARCHAR(30)   NOT NULL,              -- INTEREST_CREDIT | TAX | WITHDRAWAL_FEE | PENALTY | SERVICE_FEE
    description   VARCHAR(255)  NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_charge          PRIMARY KEY (charge_id),
    CONSTRAINT uk_charge_code     UNIQUE      (charge_code),
    CONSTRAINT chk_charge_type    CHECK (charge_type IN ('INTEREST_CREDIT', 'TAX', 'WITHDRAWAL_FEE', 'PENALTY', 'SERVICE_FEE'))
) ENGINE = InnoDB
  COMMENT = 'Master data: catalogue of charges';


-- ---------------------------------------------------------------------
--  3.2  product_charge  — how a charge applies to a product:
--       FLAT (amount + currency) or PERCENTAGE (percentage), for a period.
-- ---------------------------------------------------------------------
CREATE TABLE product_charge (
    product_charge_id BIGINT         NOT NULL AUTO_INCREMENT,
    product_id        BIGINT         NOT NULL,
    charge_id         BIGINT         NOT NULL,
    amount            DECIMAL(18,2)  NULL,             -- used when calculation_type = FLAT
    percentage        DECIMAL(8,4)   NULL,             -- used when calculation_type = PERCENTAGE
    currency_code     CHAR(3)        NULL,             -- mandatory for FLAT
    calculation_type  VARCHAR(30)    NOT NULL,         -- FLAT | PERCENTAGE
    frequency         VARCHAR(30)    NULL,             -- ONE_TIME | MONTHLY | QUARTERLY | ANNUALLY | PER_TRANSACTION
    effective_from    DATE           NOT NULL,
    effective_to      DATE           NULL,
    status            VARCHAR(30)    NOT NULL DEFAULT 'ACTIVE',
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_charge           PRIMARY KEY (product_charge_id),
    CONSTRAINT uk_product_charge           UNIQUE      (product_id, charge_id, effective_from),
    INDEX      idx_product_charge_charge   (charge_id),
    CONSTRAINT fk_product_charge_product   FOREIGN KEY (product_id)
                                           REFERENCES product (product_id)
                                           ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_product_charge_charge    FOREIGN KEY (charge_id)
                                           REFERENCES charge (charge_id)
                                           ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_product_charge_calc     CHECK (calculation_type IN ('FLAT', 'PERCENTAGE')),
    CONSTRAINT chk_product_charge_freq     CHECK (frequency IS NULL OR frequency IN ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'PER_TRANSACTION')),
    CONSTRAINT chk_product_charge_status   CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_product_charge_value    CHECK (
           (calculation_type = 'FLAT'       AND amount     IS NOT NULL AND amount     >= 0 AND currency_code IS NOT NULL)
        OR (calculation_type = 'PERCENTAGE' AND percentage IS NOT NULL AND percentage >= 0 AND percentage <= 100)
    ),
    CONSTRAINT chk_product_charge_effective CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE = InnoDB
  COMMENT = 'Charges applicable to a product and how they are computed';


-- =====================================================================
--  4. PRODUCT COMMUNICATION
-- =====================================================================

-- ---------------------------------------------------------------------
--  4.1  product_notification  — which notifications a product sends,
--       on which event, over which channel (consumed by L18 batch jobs).
-- ---------------------------------------------------------------------
CREATE TABLE product_notification (
    notification_id     BIGINT        NOT NULL AUTO_INCREMENT,
    product_id          BIGINT        NOT NULL,
    notification_type   VARCHAR(30)   NOT NULL,        -- FD_CREATED | INTEREST_PAID | MATURITY_DUE | MATURED | PREMATURE_CLOSURE ...
    trigger_event       VARCHAR(100)  NOT NULL,        -- human-readable trigger, e.g. "Account opened"
    channel             VARCHAR(30)   NOT NULL,        -- EMAIL | SMS | PUSH | WHATSAPP
    template_reference  VARCHAR(255)  NULL,            -- template id / file in the notification service
    status              VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_notification    PRIMARY KEY (notification_id),
    CONSTRAINT uk_notification_product    UNIQUE      (product_id, notification_type, channel),
    CONSTRAINT fk_notification_product    FOREIGN KEY (product_id)
                                          REFERENCES product (product_id)
                                          ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_notification_channel   CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP')),
    CONSTRAINT chk_notification_status    CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE = InnoDB
  COMMENT = 'Notification configuration per product';


-- =====================================================================
--  FOREIGN-KEY MAP
-- =====================================================================
--  product.product_type_id            -> product_type_master.product_type_id   (RESTRICT: master rows in use cannot be deleted)
--  product_characteristic.product_id  -> product.product_id                    (CASCADE)
--  product_rule.product_id            -> product.product_id                    (CASCADE)
--  product_pricing.product_id         -> product.product_id                    (CASCADE)
--  interest_rate.pricing_id           -> product_pricing.pricing_id            (CASCADE)
--  rate_matrix.pricing_id             -> product_pricing.pricing_id            (CASCADE)
--  product_charge.product_id          -> product.product_id                    (CASCADE)
--  product_charge.charge_id           -> charge.charge_id                      (RESTRICT)
--  product_notification.product_id    -> product.product_id                    (CASCADE)
--
--  Rule of thumb: rows that only exist AS PART OF a product (or a pricing
--  plan) cascade with it; references to shared master data are RESTRICTed
--  so a product type or charge cannot vanish while a product still uses it.
--
--  Integration point owned by the FD Account group (not created here):
--  fixed_deposit_account.product_code -> product.product_code
