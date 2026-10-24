package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;

public record CategoryRateRequestDto(
        @NotBlank @Size(max = 30) String categoryCode,
        @NotBlank @Size(max = 100) String displayName,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal adjustmentPercent,
        @Min(0) @Max(130) Integer minAge,
        @Min(0) @Max(130) Integer maxAge,
        @Pattern(regexp = "(?i)M|F|X") String gender,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo) {
}
