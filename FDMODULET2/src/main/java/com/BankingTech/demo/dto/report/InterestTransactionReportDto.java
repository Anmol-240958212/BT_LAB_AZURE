package com.BankingTech.demo.dto.report;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InterestTransactionReportDto(String accountNo, String productCode, String currency,
                                           BigDecimal principal, BigDecimal interestAmount,
                                           LocalDateTime postedAt, String status) { }
