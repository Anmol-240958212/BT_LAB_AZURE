package com.bankingtech.product.dto;

import java.math.BigDecimal;
import com.bankingtech.product.entity.enums.RecordStatus;

/**
 * Penalty configuration for premature withdrawal (Lab L15 integration).
 */
public record ProductPenaltyResponseDto(
        String productCode,
        String productName,
        RecordStatus status,
        BigDecimal penaltyPercent,
        BigDecimal flatFee,
        String currency,
        String remarks) {
}
