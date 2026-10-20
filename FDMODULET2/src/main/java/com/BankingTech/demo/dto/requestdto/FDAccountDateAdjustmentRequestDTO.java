package com.BankingTech.demo.dto.requestdto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record FDAccountDateAdjustmentRequestDTO(
        @NotNull LocalDate openingDate,
        @NotNull LocalDate maturityDate) { }
