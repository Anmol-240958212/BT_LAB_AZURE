package com.bankingtech.product.dto;

import java.math.BigDecimal;

import com.bankingtech.product.entity.enums.CalculationType;
import com.bankingtech.product.entity.enums.Frequency;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductChargeRequestDto(
        @NotBlank String chargeCode,
        @NotNull CalculationType calculationType,
        @DecimalMin("0.0") BigDecimal amount,
        @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal percentage,
        String currencyCode,
        Frequency frequency) {
}
