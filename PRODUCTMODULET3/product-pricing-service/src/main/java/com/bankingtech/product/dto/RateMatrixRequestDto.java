package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.bankingtech.product.entity.enums.DurationUnit;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RateMatrixRequestDto(
        @NotNull @DecimalMin("0.0") BigDecimal minAmount,
        @NotNull @DecimalMin("0.0") BigDecimal maxAmount,
        @NotNull @Min(1) Integer durationFrom,
        @NotNull @Min(1) Integer durationTo,
        @NotNull DurationUnit durationUnit,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal rate,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
