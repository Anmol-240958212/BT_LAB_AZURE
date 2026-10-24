-- Durable record of authenticated product-management actions (manual Lab L9).
-- IF NOT EXISTS keeps the standalone Workbench schema and Flyway history compatible.
CREATE TABLE IF NOT EXISTS product_audit (
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
