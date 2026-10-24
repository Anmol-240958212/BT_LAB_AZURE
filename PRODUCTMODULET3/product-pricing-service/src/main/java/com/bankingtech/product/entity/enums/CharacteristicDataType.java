package com.bankingtech.product.entity.enums;

/**
 * Tells which value column of product_characteristic holds the value.
 * Mirrors {@code chk_characteristic_data_type} and
 * {@code chk_characteristic_value_for_type} in V1__init_schema.sql.
 */
public enum CharacteristicDataType {
    /** value_text is filled            (e.g. INTEREST_TYPE = "COMPOUND") */
    TEXT,
    /** value_number is filled          (e.g. TERM_MIN_MONTHS = 3)        */
    NUMBER,
    /** value_percentage is filled      (e.g. RATE_MAX = 7.5)             */
    PERCENTAGE,
    /** value_amount + currency_code    (e.g. AMOUNT_MIN = 1000.00 INR)   */
    AMOUNT
}
