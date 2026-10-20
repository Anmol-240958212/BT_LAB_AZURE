package com.BankingTech.demo.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CustomerPortfolioDto(Long customerId, String customerName, String customerType, String customerStatus,
                                   String customerClassification, String kycStatus, String preferredLanguage, String countryOfOrigin,
                                   long totalAccounts, BigDecimal totalPrincipal, BigDecimal totalInterestAccrued,
                                   List<Account> accounts) {
    public record Account(String accountNo, String productCode, String currency, BigDecimal principal, BigDecimal rate,
                          BigDecimal accruedInterest, LocalDate maturityDate, String status, String interestFrequency) { }
}
