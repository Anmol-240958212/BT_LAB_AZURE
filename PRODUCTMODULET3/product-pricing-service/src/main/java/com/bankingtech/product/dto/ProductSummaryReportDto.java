package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Aggregated operational summary report for Product and Pricing (Lab L21 integration).
 */
public record ProductSummaryReportDto(
        long totalProducts,
        long activeProducts,
        long inactiveProducts,
        Map<String, Long> productCountByType,
        BigDecimal minConfiguredRate,
        BigDecimal maxConfiguredRate,
        BigDecimal averageBaseRate) {
}
