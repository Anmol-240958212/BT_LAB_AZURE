package com.bankingtech.product.entity.enums;

/**
 * Category of a charge master row.
 * Mirrors {@code chk_charge_type} in V1__init_schema.sql.
 */
public enum ChargeType {
    /** periodic crediting of interest (lab manual: "interest credit")  */
    INTEREST_CREDIT,
    /** TDS on interest earned          (lab manual: "tax")             */
    TAX,
    /** flat premature-withdrawal fee   (lab manual: "withdrawal fees") */
    WITHDRAWAL_FEE,
    /** rate reduction on early withdrawal (Lab L14)                    */
    PENALTY,
    /** one-time processing fee at account opening                      */
    PROCESSING_FEE
}
