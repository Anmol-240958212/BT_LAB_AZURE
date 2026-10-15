package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.entity.enums.RateType;
import com.bankingtech.product.entity.enums.Frequency;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record ProductUpdateRequestDto(
        @Size(max = 100) String productName,
        @Size(max = 255) String description,
        LocalDate effectiveDate,
        LocalDate effectiveTo,
        RecordStatus status,
        @Valid TermLimitDto termLimit,
        @Valid RateLimitDto rateLimit,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal baseRate,
        RateType rateType,
        Frequency frequency,
        List<@NotBlank @Size(max = 40) String> transactionTypes,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal maxAdditionalPercent) {
}
