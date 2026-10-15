package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.bankingtech.product.entity.enums.RecordStatus;

public record ProductResponseDto(
        String productCode,
        String productName,
        String productType,
        String productTypeName,
        String currency,
        String description,
        LocalDate effectiveDate,
        LocalDate effectiveTo,
        RecordStatus status,
        TermLimitDto termLimit,
        RateLimitDto rateLimit,
        BigDecimal baseRate,
        BigDecimal maxAdditionalPercent,
        List<ProductChargeResponseDto> charges,
        List<String> allowedCustomerRoles,
        List<String> transactionTypes,
        List<RateMatrixResponseDto> rateMatrix) {
}
