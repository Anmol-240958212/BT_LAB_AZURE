package com.bankingtech.product.enums;

/**
 * How often a COMPOUND interest rate compounds.
 *
 * <p>Stored as VARCHAR in {@code interest_rate.frequency (chk_interest_rate_freq)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum CompoundingFrequency {
    MONTHLY,
    QUARTERLY,
    HALF_YEARLY,
    ANNUALLY
}
