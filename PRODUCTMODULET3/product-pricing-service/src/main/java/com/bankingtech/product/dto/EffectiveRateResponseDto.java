package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.util.List;

public record EffectiveRateResponseDto(
        String productCode,
        BigDecimal baseRate,
        BigDecimal totalAdjustmentPercent,
        BigDecimal effectiveRate,
        BigDecimal rateCap,
        BigDecimal additionalRateCap,
        boolean capped,
        List<String> appliedCategories) {
}
