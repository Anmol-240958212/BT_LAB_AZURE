package com.bankingtech.product.dto;

import java.math.BigDecimal;
import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.RateType;
import com.bankingtech.product.entity.enums.RecordStatus;

/**
 * Result of validating product parameters for account creation (Lab L13 integration).
 */
public record ProductValidationResponseDto(
        boolean valid,
        String productCode,
        String productName,
        String productType,
        RecordStatus status,
        Integer termMonths,
        TermLimitDto termLimit,
        BigDecimal amount,
        String currency,
        BigDecimal applicableRate,
        RateType rateType,
        Frequency frequency,
        String message) {
}
