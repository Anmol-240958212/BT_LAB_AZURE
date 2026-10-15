package com.bankingtech.product.entity.enums;

/**
 * How a product_charge is computed.
 * Mirrors {@code chk_product_charge_calc_type} and
 * {@code chk_product_charge_value_for_type} in V1__init_schema.sql.
 */
public enum CalculationType {
    /** fixed amount, e.g. Rs.200 - product_charge.amount must be set      */
    FLAT,
    /** percentage of a base, e.g. 10% TDS - product_charge.percentage set */
    PERCENTAGE
}
