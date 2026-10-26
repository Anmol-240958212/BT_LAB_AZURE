-- Default, authoritative rate adjustments for the customer classifications
-- verified by the Authentication service.  A product administrator can still
-- maintain dated category-rate rules through the Product & Pricing API/UI;
-- this migration only fills in a missing default for existing FD products.
--
-- The rates are capped by CategoryPricingService using each product's own
-- RATE_LIMIT / CATEGORY_RATE_CAP configuration.

INSERT INTO product_rule (
    product_id,
    rule_code,
    rule_name,
    rule_type,
    rule_definition,
    effective_from,
    effective_to,
    status
)
SELECT
    p.product_id,
    defaults.rule_code,
    defaults.rule_name,
    'CATEGORY_PRICING',
    defaults.rule_definition,
    CURRENT_DATE,
    NULL,
    'ACTIVE'
FROM product p
JOIN product_type_master pt ON pt.product_type_id = p.product_type_id
JOIN (
    SELECT
        'SENIOR_CITIZEN' AS rule_code,
        'Senior citizen rate' AS rule_name,
        JSON_OBJECT(
            'categoryCode', 'SENIOR_CITIZEN',
            'displayName', 'Senior citizen',
            'adjustmentPercent', 0.50,
            'minAge', 60,
            'maxAge', -1,
            'gender', ''
        ) AS rule_definition
    UNION ALL
    SELECT
        'EMPLOYEE',
        'Verified bank employee rate',
        JSON_OBJECT(
            'categoryCode', 'EMPLOYEE',
            'displayName', 'Verified bank employee',
            'adjustmentPercent', 1.00,
            'minAge', -1,
            'maxAge', -1,
            'gender', ''
        )
    UNION ALL
    SELECT
        'PREMIUM_WEALTH_CUSTOMER',
        'Verified premium wealth rate',
        JSON_OBJECT(
            'categoryCode', 'PREMIUM_WEALTH_CUSTOMER',
            'displayName', 'Verified premium wealth customer',
            'adjustmentPercent', 0.25,
            'minAge', -1,
            'maxAge', -1,
            'gender', ''
        )
) defaults
WHERE pt.type_code = 'FD'
  AND NOT EXISTS (
      SELECT 1
      FROM product_rule existing
      WHERE existing.product_id = p.product_id
        AND existing.rule_code = defaults.rule_code
  );
