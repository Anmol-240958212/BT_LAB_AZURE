package com.BankingTech.demo.dto.report;

import com.BankingTech.demo.dto.CustomerReportResponseEvent;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Complete, in-memory maturity report. Customer data is obtained from Auth only for this response. */
public record FdMaturityReportDto(
        String reportType,
        LocalDateTime reportGeneratedAt,
        CustomerReportResponseEvent.Customer customer,
        Account fdAccount,
        List<InterestTransaction> interestTransactions,
        List<Transaction> transactions,
        Maturity maturity,
        List<Notification> notifications) {

    public record Account(String accountNo, String customerId, String productCode, String currency,
            BigDecimal principal, BigDecimal rate, Integer termMonths, LocalDateTime openedAt,
            LocalDate maturityDate, String interestType, String interestPayoutType,
            String interestFrequency, String status, LocalDateTime closedAt, BigDecimal accruedInterest) { }
    public record InterestTransaction(String id, BigDecimal amount, LocalDateTime postedAt, String status,
            Audit audit) { }
    public record Transaction(String id, String type, LocalDateTime occurredAt, BigDecimal amount,
            BigDecimal penaltyAmount, String remarks, Audit audit) { }
    public record Audit(String crudValue, String userId, String workstationId, String ruleSystemId,
            LocalDateTime acceptanceTimestamp, String uuid) { }
    public record Maturity(String transactionId, LocalDateTime processedAt, BigDecimal grossPayout,
            BigDecimal principalComponent, BigDecimal interestComponent, BigDecimal penaltyAmount,
            BigDecimal netPayout, LocalDateTime accountClosedAt) { }
    public record Notification(String id, String type, String channel, String maskedRecipient, String status,
            LocalDateTime sentAt, String failureMessage, BigDecimal maturityAmount, LocalDate maturityDate) { }
}
