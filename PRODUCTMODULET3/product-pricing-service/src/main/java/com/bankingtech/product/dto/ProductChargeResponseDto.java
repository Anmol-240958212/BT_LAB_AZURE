package com.bankingtech.product.dto;

import java.math.BigDecimal;

import com.bankingtech.product.entity.enums.CalculationType;
import com.bankingtech.product.entity.enums.Frequency;

public record ProductChargeResponseDto(
        String chargeCode,
        String chargeName,
        CalculationType calculationType,
        BigDecimal amount,
        BigDecimal percentage,
        String currencyCode,
        Frequency frequency) {
}
