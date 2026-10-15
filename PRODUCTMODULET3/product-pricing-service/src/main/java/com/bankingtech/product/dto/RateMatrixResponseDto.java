package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.bankingtech.product.entity.enums.DurationUnit;

public record RateMatrixResponseDto(
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Integer durationFrom,
        Integer durationTo,
        DurationUnit durationUnit,
        BigDecimal rate,
        LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
