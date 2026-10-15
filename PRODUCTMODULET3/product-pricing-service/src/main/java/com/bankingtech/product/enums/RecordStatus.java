package com.bankingtech.product.enums;

/**
 * Simple on/off state used by rules, pricing plans, product charges and notifications.
 *
 * <p>Stored as VARCHAR in {@code product_rule.status, product_pricing.status, product_charge.status, product_notification.status}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum RecordStatus {
    ACTIVE,
    INACTIVE
}
