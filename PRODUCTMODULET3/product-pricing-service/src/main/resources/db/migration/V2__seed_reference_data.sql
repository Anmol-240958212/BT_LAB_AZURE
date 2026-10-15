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
