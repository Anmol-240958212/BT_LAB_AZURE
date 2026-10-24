package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.RateType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProductCreateRequestDto(
        @NotBlank @Size(max = 30) @Pattern(regexp = "[A-Za-z0-9_-]+") String productCode,
        @NotBlank @Size(max = 100) String productName,
        @NotBlank @Size(max = 30) String productType,
        @Size(min = 3, max = 3) String currency,
        @Size(max = 255) String description,
        @NotNull LocalDate effectiveDate,
        LocalDate effectiveTo,
        @NotNull @Valid TermLimitDto termLimit,
        @NotNull @Valid RateLimitDto rateLimit,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal baseRate,
        RateType rateType,
        Frequency frequency,
        List<@Valid ProductChargeRequestDto> charges,
        List<@NotBlank @Size(max = 40) String> allowedCustomerRoles,
        List<@NotBlank @Size(max = 40) String> transactionTypes,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal maxAdditionalPercent,
        List<@Valid RateMatrixRequestDto> rateMatrix) {
}
