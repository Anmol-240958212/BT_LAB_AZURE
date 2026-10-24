package com.bankingtech.product.entity.enums;

/**
 * Compounding / payout frequency (interest_rate.frequency) and charge
 * collection frequency (product_charge.frequency).
 * Mirrors {@code chk_interest_rate_frequency} and
 * {@code chk_product_charge_frequency} in V1__init_schema.sql.
 */
public enum Frequency {
    ONE_TIME,
    MONTHLY,
    QUARTERLY,
    HALF_YEARLY,
    ANNUALLY,
    AT_MATURITY
}
