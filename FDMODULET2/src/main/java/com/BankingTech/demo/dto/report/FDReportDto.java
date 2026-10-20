package com.BankingTech.demo.dto.report;

import java.math.BigDecimal;

public record FDReportDto(String productCode, String currency, long totalAccounts,
                          BigDecimal totalPrincipal, BigDecimal totalInterestAccrued) { }
