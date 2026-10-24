package com.bankingtech.product.entity.enums;

/**
 * Kind of pricing record attached to a product.
 * Mirrors {@code chk_pricing_type} in V1__init_schema.sql.
 */
public enum PricingType {
    /** the normal card rate                                  */
    STANDARD,
    /** time-boxed offer, usually with an effective_to date   */
    PROMOTIONAL,
    /** rate depends on amount / duration bands (rate_matrix) */
    TIERED
}
