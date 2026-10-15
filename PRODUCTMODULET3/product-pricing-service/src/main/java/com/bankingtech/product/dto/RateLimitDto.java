package com.bankingtech.product.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record RateLimitDto(
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal min,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal max) {
}
