package com.bankingtech.product.enums;

/**
 * How a product charge is computed.
 *
 * <p>Stored as VARCHAR in {@code product_charge.calculation_type (chk_product_charge_calc)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum CalculationType {
    /** Fixed amount in a currency (product_charge.amount + currency_code). */
    FLAT,
    /** Percentage of the base amount (product_charge.percentage). */
    PERCENTAGE
}
