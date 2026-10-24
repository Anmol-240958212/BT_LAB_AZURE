package com.bankingtech.product.entity.enums;

/**
 * How interest is computed on the base rate.
 * Mirrors {@code chk_interest_rate_type} in V1__init_schema.sql.
 */
public enum RateType {
    SIMPLE,
    COMPOUND
}
