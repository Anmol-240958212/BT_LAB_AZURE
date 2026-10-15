package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CategoryRateResponseDto(
        String categoryCode,
        String displayName,
        BigDecimal adjustmentPercent,
        Integer minAge,
        Integer maxAge,
        String gender,
        LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
