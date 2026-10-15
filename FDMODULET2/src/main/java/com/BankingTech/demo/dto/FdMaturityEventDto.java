package com.BankingTech.demo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FdMaturityEventDto(String eventId, String customerId, String fdAccountNo,
        BigDecimal maturityAmount, LocalDate maturityDate) { }
