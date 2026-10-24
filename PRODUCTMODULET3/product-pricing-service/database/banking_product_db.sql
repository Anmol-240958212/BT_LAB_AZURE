-- =====================================================================
--  banking_product_db.sql  -  ONE-SHOT SCRIPT FOR MYSQL WORKBENCH
--  Product & Pricing Module (Lab L5) - Banking Technology Lab (CSF 3142)
--  Group 8 - Database & Entities: Prathik P Kotian, Arun Brahmananda Bansode
--
--  What it does
--    1. creates the database banking_product_db (if missing) and selects it
--    2. DROPS the module tables if they exist  (child tables first,
--       so no FK blocks the drop)  ->  re-running the script gives a clean
--       schema every time, handy for lab demos
--    3. creates the 10 core tables and product audit table (Flyway V1/V3)
--    4. inserts the reference rows (identical to V2__seed_reference_data.sql)
--
--  This file is GENERATED from the Flyway migrations - edit those,
--  then regenerate; never edit this file by hand.
--
--  Run:  MySQL Workbench -> File > Open SQL Script -> Ctrl+Shift+Enter
--   or:  mysql -u root -p < database/banking_product_db.sql
--
--  Afterwards Spring Boot's Flyway sees the tables, records a baseline
--  (spring.flyway.baseline-on-migrate=true) and does not try to recreate them.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS banking_product_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE banking_product_db;

-- Drop in reverse dependency order (children before parents).
DROP TABLE IF EXISTS product_notification;
DROP TABLE IF EXISTS product_audit;
DROP TABLE IF EXISTS product_charge;
DROP TABLE IF EXISTS rate_matrix;
DROP TABLE IF EXISTS interest_rate;
DROP TABLE IF EXISTS product_pricing;
DROP TABLE IF EXISTS product_rule;
DROP TABLE IF EXISTS product_characteristic;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS charge;
DROP TABLE IF EXISTS product_type_master;
-- Flyway's own bookkeeping table, so a later Spring Boot start re-baselines cleanly.
DROP TABLE IF EXISTS flyway_schema_history;


-- =====================================================================
-- V1__init_schema.sql
-- Product & Pricing Module (Lab L5) - Banking Technology Lab (CSF 3142)
-- Group 8 - Database & Entities: Prathik P Kotian, Arun Brahmananda Bansode
--
-- Database : banking_product_db (created by the JDBC URL, see application.properties)
-- Engine   : InnoDB (required for FOREIGN KEY enforcement)
-- MySQL    : 8.0.16 or newer (CHECK constraints are only ENFORCED from 8.0.16;
--            older servers parse them and silently ignore them)
--
-- Conventions
--   pk_<table>              primary key
--   uq_<table>_<cols>       unique constraint
--   fk_<child>_<parent>     foreign key
--   chk_<table>_<rule>      check constraint  (names are schema-wide in MySQL,
--                           so every one is prefixed with its table)
--   idx_<table>_<cols>      secondary index
--
--   effective_from / effective_to  temporal validity; effective_to IS NULL
--                                  means "currently in force"
--   status                         soft delete: 'ACTIVE' | 'INACTIVE'
--   created_at / updated_at        audit columns on every table
--
-- Referential-integrity policy (from production-grade-er-diagram.html)
--   master tables  (product_type_master, charge)   -> ON DELETE RESTRICT
--   child tables   (everything hanging off product) -> ON DELETE CASCADE
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PRODUCT MODULE
-- ---------------------------------------------------------------------

-- Master / lookup table of product categories (FD, RD, SB, CA ...).
CREATE TABLE product_type_master (
    product_type_id   BIGINT        NOT NULL AUTO_INCREMENT,
    type_code         VARCHAR(30)   NOT NULL,
    type_name         VARCHAR(100)  NOT NULL,
    description       VARCHAR(255)  NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_type_master   PRIMARY KEY (product_type_id),
    CONSTRAINT uq_product_type_code     UNIQUE (type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- The hub of the module. Every FD / savings account created by the other
-- groups is derived from one row here (they reference product_code).
CREATE TABLE product (
    product_id        BIGINT        NOT NULL AUTO_INCREMENT,
    product_code      VARCHAR(30)   NOT NULL,                  -- e.g. FD001 (external key used by FD groups)
    product_name      VARCHAR(100)  NOT NULL,
    product_type_id   BIGINT        NOT NULL,
    currency_code     CHAR(3)       NOT NULL DEFAULT 'INR',    -- ISO 4217
    description       VARCHAR(255)  NULL,
    status            VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    effective_from    DATE          NOT NULL,
    effective_to      DATE          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product                     PRIMARY KEY (product_id),
    CONSTRAINT uq_product_code                UNIQUE (product_code),
    CONSTRAINT fk_product_product_type        FOREIGN KEY (product_type_id)
                                              REFERENCES product_type_master (product_type_id)
                                              ON DELETE RESTRICT,
    CONSTRAINT chk_product_status             CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_product_currency_code      CHECK (currency_code REGEXP '^[A-Z]{3}$'),
    CONSTRAINT chk_product_effective_range    CHECK (effective_to IS NULL OR effective_to >= effective_from),

    INDEX idx_product_type_id        (product_type_id),         -- search by productType
    INDEX idx_product_effective_from (effective_from),          -- search by date range
    INDEX idx_product_status         (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- EAV table: one row per product attribute (TERM_MIN_MONTHS, AMOUNT_MIN, ...)
-- instead of a fixed column per attribute. The two CHECKs below give the
-- EAV pattern the type safety it normally lacks: exactly the value column
-- that matches data_type must be filled.
CREATE TABLE product_characteristic (
    characteristic_id     BIGINT        NOT NULL AUTO_INCREMENT,
    product_id            BIGINT        NOT NULL,
    characteristic_name   VARCHAR(100)  NOT NULL,
    data_type             VARCHAR(20)   NOT NULL,               -- TEXT | NUMBER | PERCENTAGE | AMOUNT
    value_text            VARCHAR(255)  NULL,
    value_number          DECIMAL(18,4) NULL,
    value_percentage      DECIMAL(8,4)  NULL,
    value_amount          DECIMAL(18,2) NULL,
    currency_code         CHAR(3)       NULL,                   -- required when data_type = AMOUNT
    effective_from        DATE          NOT NULL,
    effective_to          DATE          NULL,
    created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_characteristic            PRIMARY KEY (characteristic_id),
    -- a product cannot carry the same attribute twice; the leftmost column of
    -- this unique index also serves the "all characteristics of product X" lookup
    CONSTRAINT uq_characteristic_product_name       UNIQUE (product_id, characteristic_name),
    CONSTRAINT fk_characteristic_product            FOREIGN KEY (product_id)
                                                    REFERENCES product (product_id)
                                                    ON DELETE CASCADE,
    CONSTRAINT chk_characteristic_data_type         CHECK (data_type IN ('TEXT', 'NUMBER', 'PERCENTAGE', 'AMOUNT')),
    CONSTRAINT chk_characteristic_value_for_type    CHECK (
           (data_type = 'TEXT'       AND value_text       IS NOT NULL)
        OR (data_type = 'NUMBER'     AND value_number     IS NOT NULL)
        OR (data_type = 'PERCENTAGE' AND value_percentage IS NOT NULL)
        OR (data_type = 'AMOUNT'     AND value_amount     IS NOT NULL AND currency_code IS NOT NULL)
    ),
    CONSTRAINT chk_characteristic_effective_range   CHECK (effective_to IS NULL OR effective_to >= effective_from),

    INDEX idx_characteristic_name (characteristic_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Business rules that do not fit a single key/value pair: eligibility,
-- premature-withdrawal, and the category-pricing rules (senior citizen,
-- employee, age / gender brackets). rule_definition is a JSON column, so
-- MySQL itself rejects malformed JSON.
CREATE TABLE product_rule (
    rule_id           BIGINT        NOT NULL AUTO_INCREMENT,
    product_id        BIGINT        NOT NULL,
    rule_code         VARCHAR(30)   NOT NULL,                   -- unique within a product
    rule_name         VARCHAR(100)  NOT NULL,
    rule_type         VARCHAR(50)   NOT NULL,                   -- CATEGORY_PRICING | EARLY_WITHDRAWAL | ELIGIBILITY ...
    rule_definition   JSON          NULL,                       -- e.g. {"category":"SENIOR_CITIZEN","adjustmentPercent":0.5}
    effective_from    DATE          NOT NULL,
    effective_to      DATE          NULL,
    status            VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_rule              PRIMARY KEY (rule_id),
    CONSTRAINT uq_rule_product_code         UNIQUE (product_id, rule_code),
    CONSTRAINT fk_rule_product              FOREIGN KEY (product_id)
                                            REFERENCES product (product_id)
                                            ON DELETE CASCADE,
    CONSTRAINT chk_rule_status              CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_rule_effective_range     CHECK (effective_to IS NULL OR effective_to >= effective_from),

    INDEX idx_rule_product_type (product_id, rule_type),         -- "CATEGORY_PRICING rules of product X"
    INDEX idx_rule_type         (rule_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 2. PRICING MODULE
-- ---------------------------------------------------------------------

-- One pricing record per product per pricing_type per effective date.
-- The base rate (interest_rate) and the tiered grid (rate_matrix) hang off it.
CREATE TABLE product_pricing (
    pricing_id        BIGINT        NOT NULL AUTO_INCREMENT,
    product_id        BIGINT        NOT NULL,
    pricing_type      VARCHAR(30)   NOT NULL,                   -- STANDARD | PROMOTIONAL | TIERED
    effective_from    DATE          NOT NULL,
    effective_to      DATE          NULL,
    status            VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_pricing               PRIMARY KEY (pricing_id),
    CONSTRAINT uq_pricing_product_type_from     UNIQUE (product_id, pricing_type, effective_from),
    CONSTRAINT fk_pricing_product               FOREIGN KEY (product_id)
                                                REFERENCES product (product_id)
                                                ON DELETE CASCADE,
    CONSTRAINT chk_pricing_type                 CHECK (pricing_type IN ('STANDARD', 'PROMOTIONAL', 'TIERED')),
    CONSTRAINT chk_pricing_status               CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_pricing_effective_range      CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- The base interest rate of a pricing record. This is the "base rate" the
-- FD Calculator group fetches (Lab L6).
CREATE TABLE interest_rate (
    interest_rate_id  BIGINT        NOT NULL AUTO_INCREMENT,
    pricing_id        BIGINT        NOT NULL,
    rate              DECIMAL(8,4)  NOT NULL,                   -- annual %, e.g. 6.7500
    rate_type         VARCHAR(30)   NOT NULL,                   -- SIMPLE | COMPOUND
    frequency         VARCHAR(30)   NULL,                       -- compounding / payout frequency
    effective_from    DATE          NOT NULL,
    effective_to      DATE          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_interest_rate                     PRIMARY KEY (interest_rate_id),
    CONSTRAINT fk_interest_rate_pricing             FOREIGN KEY (pricing_id)
                                                    REFERENCES product_pricing (pricing_id)
                                                    ON DELETE CASCADE,
    CONSTRAINT chk_interest_rate_range              CHECK (rate >= 0 AND rate <= 100),
    CONSTRAINT chk_interest_rate_type               CHECK (rate_type IN ('SIMPLE', 'COMPOUND')),
    CONSTRAINT chk_interest_rate_frequency          CHECK (frequency IS NULL OR frequency IN
                                                        ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'AT_MATURITY')),
    CONSTRAINT chk_interest_rate_effective_range    CHECK (effective_to IS NULL OR effective_to >= effective_from),

    INDEX idx_interest_rate_pricing_id (pricing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tiered rates by amount band x duration band, e.g.
-- "3-6 months on Rs.1,000 - Rs.1,00,000 earns 6.5%".
CREATE TABLE rate_matrix (
    rate_matrix_id    BIGINT        NOT NULL AUTO_INCREMENT,
    pricing_id        BIGINT        NOT NULL,
    min_amount        DECIMAL(18,2) NOT NULL,
    max_amount        DECIMAL(18,2) NOT NULL,
    duration_from     INT           NOT NULL,
    duration_to       INT           NOT NULL,
    duration_unit     VARCHAR(20)   NOT NULL,                   -- DAYS | MONTHS | YEARS
    rate              DECIMAL(8,4)  NOT NULL,
    effective_from    DATE          NOT NULL,
    effective_to      DATE          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_rate_matrix                   PRIMARY KEY (rate_matrix_id),
    CONSTRAINT fk_rate_matrix_pricing           FOREIGN KEY (pricing_id)
                                                REFERENCES product_pricing (pricing_id)
                                                ON DELETE CASCADE,
    CONSTRAINT chk_rate_matrix_amount           CHECK (min_amount >= 0 AND min_amount <= max_amount),
    CONSTRAINT chk_rate_matrix_duration         CHECK (duration_from >= 0 AND duration_from <= duration_to),
    CONSTRAINT chk_rate_matrix_duration_unit    CHECK (duration_unit IN ('DAYS', 'MONTHS', 'YEARS')),
    CONSTRAINT chk_rate_matrix_rate_range       CHECK (rate >= 0 AND rate <= 100),
    CONSTRAINT chk_rate_matrix_effective_range  CHECK (effective_to IS NULL OR effective_to >= effective_from),

    INDEX idx_rate_matrix_pricing_id (pricing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 3. CHARGES
-- ---------------------------------------------------------------------

-- Master list of charge definitions shared by all products
-- (TDS, premature-withdrawal fee, interest credit ...).
CREATE TABLE charge (
    charge_id         BIGINT        NOT NULL AUTO_INCREMENT,
    charge_code       VARCHAR(30)   NOT NULL,
    charge_name       VARCHAR(100)  NOT NULL,
    charge_type       VARCHAR(30)   NOT NULL,                   -- INTEREST_CREDIT | TAX | WITHDRAWAL_FEE | PENALTY | PROCESSING_FEE
    description       VARCHAR(255)  NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_charge            PRIMARY KEY (charge_id),
    CONSTRAINT uq_charge_code       UNIQUE (charge_code),
    CONSTRAINT chk_charge_type      CHECK (charge_type IN ('INTEREST_CREDIT', 'TAX', 'WITHDRAWAL_FEE', 'PENALTY', 'PROCESSING_FEE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Junction table: which charges apply to which product, and how much.
-- FLAT charges carry an amount, PERCENTAGE charges carry a percentage - the
-- CHECK below enforces that the matching column is present.
CREATE TABLE product_charge (
    product_charge_id BIGINT        NOT NULL AUTO_INCREMENT,
    product_id        BIGINT        NOT NULL,
    charge_id         BIGINT        NOT NULL,
    calculation_type  VARCHAR(30)   NOT NULL,                   -- FLAT | PERCENTAGE
    amount            DECIMAL(18,2) NULL,                       -- for FLAT
    percentage        DECIMAL(8,4)  NULL,                       -- for PERCENTAGE
    currency_code     CHAR(3)       NULL,                       -- NULL = product's currency
    frequency         VARCHAR(30)   NULL,
    effective_from    DATE          NOT NULL,
    effective_to      DATE          NULL,
    status            VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_charge                    PRIMARY KEY (product_charge_id),
    CONSTRAINT uq_product_charge_from               UNIQUE (product_id, charge_id, effective_from),
    CONSTRAINT fk_product_charge_product            FOREIGN KEY (product_id)
                                                    REFERENCES product (product_id)
                                                    ON DELETE CASCADE,
    CONSTRAINT fk_product_charge_charge             FOREIGN KEY (charge_id)
                                                    REFERENCES charge (charge_id)
                                                    ON DELETE RESTRICT,
    CONSTRAINT chk_product_charge_calc_type         CHECK (calculation_type IN ('FLAT', 'PERCENTAGE')),
    CONSTRAINT chk_product_charge_value_for_type    CHECK (
           (calculation_type = 'FLAT'       AND amount     IS NOT NULL)
        OR (calculation_type = 'PERCENTAGE' AND percentage IS NOT NULL)
    ),
    CONSTRAINT chk_product_charge_amount            CHECK (amount IS NULL OR amount >= 0),
    CONSTRAINT chk_product_charge_percentage        CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    CONSTRAINT chk_product_charge_frequency         CHECK (frequency IS NULL OR frequency IN
                                                        ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'AT_MATURITY')),
    CONSTRAINT chk_product_charge_status            CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_product_charge_effective_range   CHECK (effective_to IS NULL OR effective_to >= effective_from),

    INDEX idx_product_charge_charge_id (charge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 4. PRODUCT COMMUNICATION
-- ---------------------------------------------------------------------

-- Which notifications a product sends, on which event, over which channel.
-- Consumed by the batch / notification labs (L18) later on.
CREATE TABLE product_notification (
    notification_id     BIGINT        NOT NULL AUTO_INCREMENT,
    product_id          BIGINT        NOT NULL,
    notification_type   VARCHAR(30)   NOT NULL,                 -- FD_CREATED | INTEREST_PAID | MATURITY ...
    trigger_event       VARCHAR(100)  NOT NULL,
    channel             VARCHAR(30)   NOT NULL,                 -- EMAIL | SMS | WHATSAPP | PUSH
    template_reference  VARCHAR(255)  NULL,
    status              VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE',
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_product_notification                  PRIMARY KEY (notification_id),
    CONSTRAINT uq_notification_product_type_channel     UNIQUE (product_id, notification_type, channel),
    CONSTRAINT fk_notification_product                  FOREIGN KEY (product_id)
                                                        REFERENCES product (product_id)
                                                        ON DELETE CASCADE,
    CONSTRAINT chk_notification_channel                 CHECK (channel IN ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH')),
    CONSTRAINT chk_notification_status                  CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 4. PRODUCT ADMINISTRATION AUDIT (Flyway V3)
-- ---------------------------------------------------------------------
CREATE TABLE product_audit (
    audit_id     BIGINT       NOT NULL AUTO_INCREMENT,
    product_code VARCHAR(30)  NOT NULL,
    action       VARCHAR(40)  NOT NULL,
    actor        VARCHAR(100) NOT NULL,
    details      JSON         NULL,
    occurred_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_id),
    INDEX idx_product_audit_code_time (product_code, occurred_at),
    INDEX idx_product_audit_actor_time (actor, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 5. FOREIGN KEY RELATIONSHIPS (summary)
-- ---------------------------------------------------------------------
-- product.product_type_id            -> product_type_master.product_type_id   RESTRICT
-- product_characteristic.product_id  -> product.product_id                    CASCADE
-- product_rule.product_id            -> product.product_id                    CASCADE
-- product_pricing.product_id         -> product.product_id                    CASCADE
-- interest_rate.pricing_id           -> product_pricing.pricing_id            CASCADE
-- rate_matrix.pricing_id             -> product_pricing.pricing_id            CASCADE
-- product_charge.product_id          -> product.product_id                    CASCADE
-- product_charge.charge_id           -> charge.charge_id                      RESTRICT
-- product_notification.product_id    -> product.product_id                    CASCADE
--
-- Integration point for the FD Account group (outside this schema):
-- fd_accounts.product_code           -> product.product_code (UNIQUE)


-- =====================================================================
-- V2__seed_reference_data.sql
-- Reference (master) rows only - products themselves are created through
-- the REST API (POST /api/product), never seeded here.
--
-- Every statement is idempotent (ON DUPLICATE KEY UPDATE on the UNIQUE code
-- column), so the script is safe even when the rows already exist - e.g.
-- when the schema was created by hand from database/banking_product_db.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- product_type_master
-- ---------------------------------------------------------------------
INSERT INTO product_type_master (type_code, type_name, description) VALUES
    ('FD', 'Fixed Deposit',     'Lump-sum term deposit earning a fixed rate until maturity'),
    ('RD', 'Recurring Deposit', 'Fixed monthly instalments over a fixed term'),
    ('SB', 'Savings Account',   'Interest-bearing demand deposit account'),
    ('CA', 'Current Account',   'Non-interest-bearing transactional account')
ON DUPLICATE KEY UPDATE type_name = type_name;

-- ---------------------------------------------------------------------
-- charge  (charge_type must be one of the values in chk_charge_type)
-- ---------------------------------------------------------------------
INSERT INTO charge (charge_code, charge_name, charge_type, description) VALUES
    ('INT_CREDIT',       'Interest Credit',                   'INTEREST_CREDIT', 'Periodic crediting of accrued interest to the account'),
    ('TDS',              'Tax Deducted at Source',            'TAX',             'TDS on interest earned, as per Income Tax Act section 194A'),
    ('PREMAT_WD_FEE',    'Premature Withdrawal Fee',          'WITHDRAWAL_FEE',  'Flat fee charged when a deposit is withdrawn before maturity'),
    ('PREMAT_PENALTY',   'Premature Withdrawal Rate Penalty', 'PENALTY',         'Percentage reduction applied to the interest rate on early withdrawal'),
    ('PROCESSING_FEE',   'Processing Fee',                    'PROCESSING_FEE',  'One-time fee collected at account opening')
ON DUPLICATE KEY UPDATE charge_name = charge_name;


-- ---------------------------------------------------------------------
-- Quick self-check: 10 core tables plus product_audit, 4 product types, 5 charges
-- ---------------------------------------------------------------------
SHOW TABLES;
SELECT type_code, type_name FROM product_type_master ORDER BY product_type_id;
SELECT charge_code, charge_type FROM charge ORDER BY charge_id;
