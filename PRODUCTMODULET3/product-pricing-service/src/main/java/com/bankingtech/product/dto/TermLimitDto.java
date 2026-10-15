package com.bankingtech.product.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record TermLimitDto(
        @NotNull @Min(1) Integer min,
        @NotNull @Min(1) Integer max) {
}
