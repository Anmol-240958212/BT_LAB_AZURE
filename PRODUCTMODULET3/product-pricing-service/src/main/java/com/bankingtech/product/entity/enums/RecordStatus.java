package com.bankingtech.product.entity.enums;

/**
 * Soft-delete status used by product, product_rule, product_pricing,
 * product_charge and product_notification.
 * <p>
 * Banking systems never hard-delete a product - FD accounts may still
 * reference it years after it stops being sold - so "delete" means
 * {@code INACTIVE}.
 * <p>
 * Stored as VARCHAR(30); the allowed values are also enforced by the
 * {@code chk_<table>_status} CHECK constraints in V1__init_schema.sql.
 */
public enum RecordStatus {
    ACTIVE,
    INACTIVE
}
