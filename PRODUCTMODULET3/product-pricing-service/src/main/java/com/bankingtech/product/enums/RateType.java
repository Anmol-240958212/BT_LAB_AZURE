package com.bankingtech.product.enums;

/**
 * How interest accrues.
 *
 * <p>Stored as VARCHAR in {@code interest_rate.rate_type (chk_interest_rate_type)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum RateType {
    SIMPLE,
    COMPOUND
}
