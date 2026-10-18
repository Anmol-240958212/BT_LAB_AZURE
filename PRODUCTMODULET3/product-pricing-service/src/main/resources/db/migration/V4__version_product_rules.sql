-- V1 and database/banking_product_db.sql use uq_rule_product_code. The historical
-- root-level 01_product_pricing_schema.sql uses uk_rule_product_code. Detect the
-- known installed names before changing anything, and fail clearly for unknown
-- schemas. No rows are deleted or changed.
DELIMITER $$
DROP PROCEDURE IF EXISTS migrate_product_rule_code_index_v4$$
CREATE PROCEDURE migrate_product_rule_code_index_v4()
BEGIN
    DECLARE legacy_index_count INT DEFAULT 0;
    DECLARE supported_index_count INT DEFAULT 0;
    DECLARE has_uq_index INT DEFAULT 0;
    DECLARE has_uk_index INT DEFAULT 0;
    DECLARE rule_definition_type VARCHAR(64) DEFAULT NULL;

    SELECT DATA_TYPE INTO rule_definition_type
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'product_rule'
       AND COLUMN_NAME = 'rule_definition';

    SELECT COUNT(*) INTO legacy_index_count
      FROM (
          SELECT INDEX_NAME
            FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'product_rule'
             AND NON_UNIQUE = 0
           GROUP BY INDEX_NAME
          HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) = 'product_id,rule_code'
      ) AS legacy_indexes;

    SELECT COUNT(*) INTO supported_index_count
      FROM (
          SELECT INDEX_NAME
            FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'product_rule'
             AND NON_UNIQUE = 0
             AND INDEX_NAME IN ('uq_rule_product_code', 'uk_rule_product_code')
           GROUP BY INDEX_NAME
          HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) = 'product_id,rule_code'
      ) AS supported_indexes;

    SELECT COUNT(*) INTO has_uq_index
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_rule'
       AND INDEX_NAME = 'uq_rule_product_code' AND NON_UNIQUE = 0;
    SELECT COUNT(*) INTO has_uk_index
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_rule'
       AND INDEX_NAME = 'uk_rule_product_code' AND NON_UNIQUE = 0;

    IF LOWER(COALESCE(rule_definition_type, '')) <> 'json' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'V4 requires product_rule.rule_definition to use MySQL JSON; the legacy standalone schema is unsupported and must be reconciled before migration';
    END IF;

    IF legacy_index_count = 0 OR legacy_index_count <> supported_index_count
       OR (has_uq_index > 0 AND NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_rule'
               AND INDEX_NAME = 'uq_rule_product_code' AND NON_UNIQUE = 0
             GROUP BY INDEX_NAME
            HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) = 'product_id,rule_code'))
       OR (has_uk_index > 0 AND NOT EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_rule'
               AND INDEX_NAME = 'uk_rule_product_code' AND NON_UNIQUE = 0
             GROUP BY INDEX_NAME
            HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) = 'product_id,rule_code')) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'V4 requires unique product_rule index uq_rule_product_code or uk_rule_product_code on (product_id, rule_code); reconcile schema and retry';
    END IF;

    IF has_uq_index > 0 THEN
        SET @drop_rule_code_uq = 'ALTER TABLE product_rule DROP INDEX uq_rule_product_code';
        PREPARE drop_rule_code_uq FROM @drop_rule_code_uq;
        EXECUTE drop_rule_code_uq;
        DEALLOCATE PREPARE drop_rule_code_uq;
    END IF;
    IF has_uk_index > 0 THEN
        SET @drop_rule_code_uk = 'ALTER TABLE product_rule DROP INDEX uk_rule_product_code';
        PREPARE drop_rule_code_uk FROM @drop_rule_code_uk;
        EXECUTE drop_rule_code_uk;
        DEALLOCATE PREPARE drop_rule_code_uk;
    END IF;
END$$
DELIMITER ;

CALL migrate_product_rule_code_index_v4();
DROP PROCEDURE migrate_product_rule_code_index_v4;

ALTER TABLE product_rule
    ADD CONSTRAINT uq_rule_product_code_from UNIQUE (product_id, rule_code, effective_from);
