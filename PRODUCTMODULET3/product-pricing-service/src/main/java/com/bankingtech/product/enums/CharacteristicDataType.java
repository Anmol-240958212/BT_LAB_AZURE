package com.bankingtech.product.enums;

/**
 * Says which value_* column of PRODUCT_CHARACTERISTIC carries the value of an EAV row.
 *
 * <p>Stored as VARCHAR in {@code product_characteristic.data_type (chk_characteristic_data_type)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum CharacteristicDataType {
    /** value_text        - e.g. INTEREST_TYPE = COMPOUND */
    TEXT,
    /** value_number      - e.g. MIN_TERM_MONTHS = 3 */
    NUMBER,
    /** value_percentage  - e.g. MAX_RATE = 7.5 */
    PERCENTAGE,
    /** value_amount + currency_code - e.g. MIN_AMOUNT = 1000.00 INR */
    AMOUNT
}
