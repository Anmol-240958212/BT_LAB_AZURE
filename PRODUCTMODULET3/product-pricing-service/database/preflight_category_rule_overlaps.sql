-- Read-only rollout preflight for MySQL 8. Reports every pair of active category
-- rules with the same normalized category code and inclusive effective periods
-- that overlap. NULL effective_to means open-ended. Review/reconcile all returned
-- rows with the business owner before deploying V4; this query never modifies data.
SELECT
    left_rule.product_id,
    left_rule.rule_id AS first_rule_id,
    left_rule.rule_code AS first_rule_code,
    left_rule.effective_from AS first_effective_from,
    left_rule.effective_to AS first_effective_to,
    right_rule.rule_id AS second_rule_id,
    right_rule.rule_code AS second_rule_code,
    right_rule.effective_from AS second_effective_from,
    right_rule.effective_to AS second_effective_to
FROM product_rule AS left_rule
JOIN product_rule AS right_rule
  ON right_rule.product_id = left_rule.product_id
 AND right_rule.rule_id > left_rule.rule_id
 AND UPPER(COALESCE(
       NULLIF(JSON_UNQUOTE(JSON_EXTRACT(left_rule.rule_definition, '$.categoryCode')), ''),
       NULLIF(JSON_UNQUOTE(JSON_EXTRACT(left_rule.rule_definition, '$.category')), ''),
       left_rule.rule_code))
     = UPPER(COALESCE(
       NULLIF(JSON_UNQUOTE(JSON_EXTRACT(right_rule.rule_definition, '$.categoryCode')), ''),
       NULLIF(JSON_UNQUOTE(JSON_EXTRACT(right_rule.rule_definition, '$.category')), ''),
       right_rule.rule_code))
 AND left_rule.effective_from <= COALESCE(right_rule.effective_to, '9999-12-31')
 AND right_rule.effective_from <= COALESCE(left_rule.effective_to, '9999-12-31')
WHERE left_rule.rule_type = 'CATEGORY_PRICING'
  AND right_rule.rule_type = 'CATEGORY_PRICING'
  AND left_rule.status = 'ACTIVE'
  AND right_rule.status = 'ACTIVE'
ORDER BY left_rule.product_id, left_rule.rule_code,
         left_rule.effective_from, right_rule.effective_from;
