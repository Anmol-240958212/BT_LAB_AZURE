package com.BankingTech.demo.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MaturityReportDto(LocalDate maturityDate, String currency, long totalAccounts,
                                BigDecimal totalPrincipal, BigDecimal accruedInterest) { }
