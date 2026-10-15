package com.bankingtech.product.enums;

/**
 * Kind of pricing plan attached to a product.
 *
 * <p>Stored as VARCHAR in {@code product_pricing.pricing_type (chk_pricing_type)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum PricingType {
    /** Default card rates. */
    STANDARD,
    /** Time-boxed promotional rates. */
    PROMOTIONAL,
    /** Rates that depend on amount / tenure bands in RATE_MATRIX. */
    TIERED
}
