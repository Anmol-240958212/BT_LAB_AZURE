package com.bankingtech.product.enums;

/**
 * Lifecycle state of a product.
 *
 * <p>Stored as VARCHAR in {@code product.status (chk_product_status)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum ProductStatus {
    /** Being configured; not yet sellable. */
    DRAFT,
    /** Live - accounts can be opened against it. */
    ACTIVE,
    /** Temporarily withdrawn from sale. */
    INACTIVE,
    /** Permanently closed for new accounts. */
    RETIRED
}
