package com.bankingtech.product.enums;

/**
 * How often a product charge is levied.
 *
 * <p>Stored as VARCHAR in {@code product_charge.frequency (chk_product_charge_freq)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum ChargeFrequency {
    ONE_TIME,
    MONTHLY,
    QUARTERLY,
    ANNUALLY,
    PER_TRANSACTION
}
