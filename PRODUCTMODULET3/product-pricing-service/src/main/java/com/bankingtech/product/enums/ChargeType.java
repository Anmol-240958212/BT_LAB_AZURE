package com.bankingtech.product.enums;

/**
 * Category of a charge in the CHARGE master.
 *
 * <p>Stored as VARCHAR in {@code charge.charge_type (chk_charge_type)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum ChargeType {
    INTEREST_CREDIT,
    TAX,
    WITHDRAWAL_FEE,
    PENALTY,
    SERVICE_FEE
}
