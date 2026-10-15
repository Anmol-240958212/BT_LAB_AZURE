-- =====================================================================
--  Product & Pricing Module — Seed / demo data (OPTIONAL)
--  Run AFTER Flyway has created the schema and seeded reference data.
--  Replaces only the two demo product codes (FD001 and SB001), then
--  populates every one of the 10 tables so APIs and the FD Calculator have
--  something real to query:
--     FD001  Fixed Deposit - Short Term   (the Lab L5 manual example)
--     SB001  Regular Savings Account
-- =====================================================================
USE banking_product_db;

-- These are reserved demo codes for this optional script. Product children
-- are removed through the schema's ON DELETE CASCADE relationships.
DELETE FROM product WHERE product_code IN ('FD001', 'SB001');

-- ---------------------------------------------------------------------
--  Master data
-- ---------------------------------------------------------------------
INSERT INTO product_type_master (type_code, type_name, description) VALUES
    ('FD', 'Fixed Deposit',     'Lump-sum term deposit earning a fixed rate for a fixed tenure'),
    ('RD', 'Recurring Deposit', 'Fixed monthly instalments for a fixed tenure'),
    ('SB', 'Savings Account',   'Day-to-day deposit account with interest on daily balance'),
    ('CA', 'Current Account',   'Transactional account for businesses, no interest')
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name), description = VALUES(description);

INSERT INTO charge (charge_code, charge_name, charge_type, description) VALUES
    ('TDS',        'Tax Deducted at Source',      'TAX',             'Deducted on interest above the Section 194A threshold'),
    ('PREMAT_WD_FEE', 'Premature Withdrawal Fee', 'WITHDRAWAL_FEE',  'Flat fee on breaking a deposit before maturity'),
    ('PREMAT_PENALTY', 'Premature Withdrawal Penalty', 'PENALTY',    'Rate reduction applied on premature closure'),
    ('INT_CREDIT', 'Interest Credit',             'INTEREST_CREDIT', 'Periodic crediting of accrued interest'),
    ('SMS_FEE',    'SMS Alert Charge',            'PROCESSING_FEE',  'Quarterly charge for transaction SMS alerts')
ON DUPLICATE KEY UPDATE charge_name = VALUES(charge_name), charge_type = VALUES(charge_type),
                        description = VALUES(description);

-- ---------------------------------------------------------------------
--  Products
-- ---------------------------------------------------------------------
INSERT INTO product (product_code, product_name, product_type_id, description, currency_code, status, effective_from)
VALUES
    ('FD001', 'Fixed Deposit - Short Term',
        (SELECT product_type_id FROM product_type_master WHERE type_code = 'FD'),
        'Term deposit of 3 to 36 months with quarterly compounding', 'INR', 'ACTIVE', '2025-07-01'),
    ('SB001', 'Regular Savings Account',
        (SELECT product_type_id FROM product_type_master WHERE type_code = 'SB'),
        'Standard savings account for resident individuals', 'INR', 'ACTIVE', '2025-04-01');

SET @fd001 = (SELECT product_id FROM product WHERE product_code = 'FD001');
SET @sb001 = (SELECT product_id FROM product WHERE product_code = 'SB001');

-- ---------------------------------------------------------------------
--  Characteristics (EAV) — the L5 payload's termLimit / rateLimit and
--  the amount limits live here as rows
-- ---------------------------------------------------------------------
INSERT INTO product_characteristic
    (product_id, characteristic_name, data_type, value_text, value_number, value_percentage, value_amount, currency_code, effective_from)
VALUES
    (@fd001, 'MIN_TERM_MONTHS',           'NUMBER',     NULL,       3,     NULL,   NULL,          NULL,  '2025-07-01'),
    (@fd001, 'MAX_TERM_MONTHS',           'NUMBER',     NULL,       36,    NULL,   NULL,          NULL,  '2025-07-01'),
    (@fd001, 'MIN_RATE',                  'PERCENTAGE', NULL,       NULL,  5.0000, NULL,          NULL,  '2025-07-01'),
    (@fd001, 'MAX_RATE',                  'PERCENTAGE', NULL,       NULL,  7.5000, NULL,          NULL,  '2025-07-01'),
    (@fd001, 'MIN_AMOUNT',                'AMOUNT',     NULL,       NULL,  NULL,   1000.00,       'INR', '2025-07-01'),
    (@fd001, 'MAX_AMOUNT',                'AMOUNT',     NULL,       NULL,  NULL,   100000000.00,  'INR', '2025-07-01'),
    (@fd001, 'INTEREST_TYPE',             'TEXT',       'COMPOUND', NULL,  NULL,   NULL,          NULL,  '2025-07-01'),
    (@fd001, 'PREMATURE_PENALTY_PERCENT', 'PERCENTAGE', NULL,       NULL,  1.0000, NULL,          NULL,  '2025-07-01'),
    (@sb001, 'MIN_BALANCE',               'AMOUNT',     NULL,       NULL,  NULL,   1000.00,       'INR', '2025-04-01'),
    (@sb001, 'INTEREST_TYPE',             'TEXT',       'SIMPLE',   NULL,  NULL,   NULL,          NULL,  '2025-04-01');

-- ---------------------------------------------------------------------
--  Rules — category-based pricing (senior citizen, employee, age, gender)
--  and a cap on the total add-on, as JSON
-- ---------------------------------------------------------------------
INSERT INTO product_rule (product_id, rule_code, rule_name, rule_type, rule_definition, effective_from) VALUES
    (@fd001, 'SENIOR_BONUS',   'Senior citizen additional rate', 'CATEGORY_PRICING',
        '{"category":"SENIOR_CITIZEN","minAge":60,"adjustmentPercent":0.50}', '2025-07-01'),
    (@fd001, 'EMPLOYEE_BONUS', 'Staff additional rate',          'CATEGORY_PRICING',
        '{"category":"EMPLOYEE","adjustmentPercent":1.00}', '2025-07-01'),
    (@fd001, 'WOMEN_BONUS',    'Women depositor additional rate','CATEGORY_PRICING',
        '{"category":"WOMEN","gender":"F","adjustmentPercent":0.10}', '2025-07-01'),
    (@fd001, 'YOUTH_BONUS',    'Young saver additional rate',    'CATEGORY_PRICING',
        '{"category":"YOUTH","minAge":18,"maxAge":25,"adjustmentPercent":0.25}', '2025-07-01'),
    (@fd001, 'ADDON_CAP',      'Maximum total category add-on',  'RATE_CAP',
        '{"maxAdditionalPercent":2.00}', '2025-07-01'),
    (@fd001, 'EARLY_EXIT',     'Premature withdrawal rule',      'EARLY_WITHDRAWAL',
        '{"allowed":true,"lockInDays":7,"penaltyPercent":1.00}', '2025-07-01'),
    (@fd001, 'ELIGIBLE_AGE',   'Minimum age of depositor',       'ELIGIBILITY',
        '{"minAge":18,"residentOnly":true}', '2025-07-01');

-- ---------------------------------------------------------------------
--  Pricing plan + base rate + rate matrix
-- ---------------------------------------------------------------------
INSERT INTO product_pricing (product_id, pricing_type, effective_from) VALUES
    (@fd001, 'STANDARD', '2025-07-01'),
    (@fd001, 'TIERED',   '2025-07-01'),
    (@sb001, 'STANDARD', '2025-04-01');

SET @fd_pricing = (SELECT pricing_id FROM product_pricing WHERE product_id = @fd001 AND pricing_type = 'STANDARD');
SET @fd_matrix_pricing = (SELECT pricing_id FROM product_pricing WHERE product_id = @fd001 AND pricing_type = 'TIERED');
SET @sb_pricing = (SELECT pricing_id FROM product_pricing WHERE product_id = @sb001 AND pricing_type = 'STANDARD');

INSERT INTO interest_rate (pricing_id, rate, rate_type, frequency, effective_from) VALUES
    (@fd_pricing, 6.5000, 'COMPOUND', 'QUARTERLY', '2025-07-01'),
    (@sb_pricing, 3.0000, 'SIMPLE',   NULL,        '2025-04-01');

-- FD001 tiered rates: tenure band x amount band (below / above Rs 1 crore)
INSERT INTO rate_matrix (pricing_id, min_amount, max_amount, duration_from, duration_to, duration_unit, rate, effective_from) VALUES
    (@fd_matrix_pricing,     1000.00,   9999999.99,  3,  6, 'MONTHS', 5.5000, '2025-07-01'),
    (@fd_matrix_pricing,     1000.00,   9999999.99,  7, 12, 'MONTHS', 6.5000, '2025-07-01'),
    (@fd_matrix_pricing,     1000.00,   9999999.99, 13, 24, 'MONTHS', 7.0000, '2025-07-01'),
    (@fd_matrix_pricing,     1000.00,   9999999.99, 25, 36, 'MONTHS', 7.2500, '2025-07-01'),
    (@fd_matrix_pricing, 10000000.00, 100000000.00,  3, 12, 'MONTHS', 6.7500, '2025-07-01'),
    (@fd_matrix_pricing, 10000000.00, 100000000.00, 13, 36, 'MONTHS', 7.5000, '2025-07-01');

-- ---------------------------------------------------------------------
--  Charges applied to the products
-- ---------------------------------------------------------------------
INSERT INTO product_charge (product_id, charge_id, amount, percentage, currency_code, calculation_type, frequency, effective_from) VALUES
    (@fd001, (SELECT charge_id FROM charge WHERE charge_code = 'TDS'),        NULL,   10.0000, NULL,  'PERCENTAGE', 'ANNUALLY',  '2025-07-01'),
    (@fd001, (SELECT charge_id FROM charge WHERE charge_code = 'PREMAT_WD_FEE'),     200.00, NULL,    'INR', 'FLAT',       'ONE_TIME',  '2025-07-01'),
    (@fd001, (SELECT charge_id FROM charge WHERE charge_code = 'PREMAT_PENALTY'), NULL,   1.0000,  NULL,  'PERCENTAGE', 'ONE_TIME',  '2025-07-01'),
    (@sb001, (SELECT charge_id FROM charge WHERE charge_code = 'SMS_FEE'),    15.00,  NULL,    'INR', 'FLAT',       'QUARTERLY', '2025-04-01');

-- ---------------------------------------------------------------------
--  Notifications
-- ---------------------------------------------------------------------
INSERT INTO product_notification (product_id, notification_type, trigger_event, channel, template_reference) VALUES
    (@fd001, 'FD_CREATED',        'Fixed deposit account opened',      'EMAIL',    'tpl/fd_created_email'),
    (@fd001, 'FD_CREATED',        'Fixed deposit account opened',      'SMS',      'tpl/fd_created_sms'),
    (@fd001, 'INTEREST_PAID',     'Quarterly interest credited',       'SMS',      'tpl/interest_paid_sms'),
    (@fd001, 'MATURITY_DUE',      '7 days before maturity date',       'EMAIL',    'tpl/maturity_due_email'),
    (@fd001, 'MATURITY_DUE',      '7 days before maturity date',       'WHATSAPP', 'tpl/maturity_due_wa'),
    (@fd001, 'MATURED',           'Maturity amount paid out',          'EMAIL',    'tpl/matured_email'),
    (@fd001, 'PREMATURE_CLOSURE', 'Deposit closed before maturity',    'SMS',      'tpl/premature_sms'),
    (@sb001, 'ACCOUNT_OPENED',    'Savings account opened',            'EMAIL',    'tpl/sb_opened_email');
