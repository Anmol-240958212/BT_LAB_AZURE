package com.bankingtech.product.enums;

/**
 * Unit of the duration band of a RATE_MATRIX row.
 *
 * <p>Stored as VARCHAR in {@code rate_matrix.duration_unit (chk_rate_matrix_unit)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum DurationUnit {
    DAYS,
    MONTHS,
    YEARS
}
