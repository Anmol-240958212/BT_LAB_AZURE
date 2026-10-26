package com.BankingTech.demo.dto.report;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CustomerPortfolioDto(Long customerId, String customerName, String customerType, String customerStatus,
                                   String customerClassification, String kycStatus, String preferredLanguage, String countryOfOrigin,
                                   String email, String phoneNumber,
                                   long totalAccounts, BigDecimal totalPrincipal, BigDecimal totalInterestGenerated,
                                   List<Account> accounts) {
    public record Account(String accountNo, String productCode, String currency, BigDecimal principal, BigDecimal rate,
                          BigDecimal interestGenerated, LocalDate maturityDate, String status, String interestFrequency) { }
}
