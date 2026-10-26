package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.report.*;
import com.BankingTech.demo.entity.FDInterestTransactionEntity;
import com.BankingTech.demo.entity.FDTransactionEntity;
import com.BankingTech.demo.entity.NotificationLogEntity;
import com.BankingTech.demo.entity.FixedDepositAccountEntity;
import com.BankingTech.demo.repository.FDInterestTransactionRepository;
import com.BankingTech.demo.repository.FDTransactionRepository;
import com.BankingTech.demo.repository.FixedDepositAccountRepository;
import com.BankingTech.demo.repository.NotificationLogRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ReportingService {
    private final FixedDepositAccountRepository accounts;
    private final FDInterestTransactionRepository interestTransactions;
    private final FDTransactionRepository transactions;
    private final NotificationLogRepository notifications;
    private final FdCustomerReportKafkaClient customerReports;

    public ReportingService(FixedDepositAccountRepository accounts, FDInterestTransactionRepository interestTransactions,
            FDTransactionRepository transactions, NotificationLogRepository notifications,
            FdCustomerReportKafkaClient customerReports) {
        this.accounts = accounts; this.interestTransactions = interestTransactions; this.transactions = transactions;
        this.notifications = notifications; this.customerReports = customerReports;
    }

    public List<FDReportDto> fdSummary() {
        return accounts.findByFdAccountStatus("ACTIVE").stream()
                .collect(Collectors.groupingBy(a -> a.getFdAccountProductCode() + "|" + a.getFdAccountCurrency()))
                .entrySet().stream().map(entry -> {
                    String[] key = entry.getKey().split("\\|", 2); List<FixedDepositAccountEntity> items = entry.getValue();
                    return new FDReportDto(key[0], key[1], items.size(), sumPrincipal(items), sumAccrued(items));
                }).sorted(Comparator.comparing(FDReportDto::productCode)).toList();
    }

    public List<InterestTransactionReportDto> interestHistory() {
        Map<String, FixedDepositAccountEntity> accountByNo = accounts.findAll().stream()
                .collect(Collectors.toMap(FixedDepositAccountEntity::getFdAccountNo, a -> a));
        return interestTransactions.findAll().stream()
                .sorted(Comparator.comparing(FDInterestTransactionEntity::getFdInterestTransactionDate).reversed())
                .map(tx -> { FixedDepositAccountEntity a = accountByNo.get(tx.getFdInterestTransactionFdAccountNo());
                    return new InterestTransactionReportDto(tx.getFdInterestTransactionFdAccountNo(),
                            a == null ? null : a.getFdAccountProductCode(), a == null ? null : a.getFdAccountCurrency(),
                            a == null ? BigDecimal.ZERO : zero(a.getFdAccountPrincipal()),
                            tx.getFdInterestTransactionInterestAmount(), tx.getFdInterestTransactionDate(), tx.getFdInterestTransactionStatus()); })
                .toList();
    }

    public List<MaturityReportDto> maturitySummary() {
        return accounts.findByFdAccountStatus("ACTIVE").stream()
                .collect(Collectors.groupingBy(a -> a.getFdAccountMaturityDate() + "|" + a.getFdAccountCurrency()))
                .entrySet().stream().map(entry -> { String[] key = entry.getKey().split("\\|", 2); List<FixedDepositAccountEntity> items = entry.getValue();
                    return new MaturityReportDto(LocalDate.parse(key[0]), key[1], items.size(), sumPrincipal(items), sumAccrued(items));
                }).sorted(Comparator.comparing(MaturityReportDto::maturityDate)).toList();
    }

    public CustomerPortfolioDto portfolio(Long customerId) {
        var customer = customerReports.customer(customerId);
        List<FixedDepositAccountEntity> items = accounts.findByFdAccountCustomerId(String.valueOf(customerId));
        Set<String> accountNumbers = items.stream().map(FixedDepositAccountEntity::getFdAccountNo).collect(Collectors.toSet());
        Map<String, BigDecimal> generatedInterestByAccount = interestTransactions.findAll().stream()
                .filter(tx -> accountNumbers.contains(tx.getFdInterestTransactionFdAccountNo()))
                .filter(tx -> "ACCRUED".equalsIgnoreCase(tx.getFdInterestTransactionStatus())
                        || "CAPITALIZED".equalsIgnoreCase(tx.getFdInterestTransactionStatus()))
                .collect(Collectors.groupingBy(FDInterestTransactionEntity::getFdInterestTransactionFdAccountNo,
                        Collectors.reducing(BigDecimal.ZERO,
                                tx -> zero(tx.getFdInterestTransactionInterestAmount()), BigDecimal::add)));
        List<CustomerPortfolioDto.Account> accountDtos = items.stream().map(a -> new CustomerPortfolioDto.Account(a.getFdAccountNo(),
                a.getFdAccountProductCode(), a.getFdAccountCurrency(), a.getFdAccountPrincipal(), a.getFdAccountRate(),
                generatedInterestByAccount.getOrDefault(a.getFdAccountNo(), BigDecimal.ZERO), a.getFdAccountMaturityDate(),
                a.getFdAccountStatus(), a.getFdAccountInterestFrequency())).toList();
        BigDecimal totalInterestGenerated = accountDtos.stream().map(CustomerPortfolioDto.Account::interestGenerated)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        String classification = customer.classificationType() == null ? customer.classificationValue()
                : customer.classificationType() + (customer.classificationValue() == null ? "" : ": " + customer.classificationValue());
        return new CustomerPortfolioDto(customer.customerId(), customer.fullName(), customer.customerTypeName(), customer.customerStatus(),
                classification, customer.kycStatus(), customer.preferredLanguage(), customer.countryOfOrigin(),
                items.size(), sumPrincipal(items), totalInterestGenerated, accountDtos);
    }

    /** Builds a final maturity or premature-withdrawal settlement report without persisting Auth's customer reply. */
    public FdMaturityReportDto maturityReport(String accountNo) {
        FixedDepositAccountEntity account = accounts.findById(accountNo).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "FD account not found"));
        if (!"CLOSED".equalsIgnoreCase(account.getFdAccountStatus())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "A settlement report is available only after the account is closed");
        }
        List<FDTransactionEntity> txs = transactions.findByFdTransactionFdAccountNoOrderByFdTransactionTxnDateAsc(accountNo);
        FDTransactionEntity payout = txs.stream().filter(tx -> "MATURITY_PAYOUT".equalsIgnoreCase(tx.getFdTransactionTxnType())
                        || "WITHDRAWAL".equalsIgnoreCase(tx.getFdTransactionTxnType()))
                .findFirst().orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                        "This closed account has no settlement transaction"));
        Long customerId;
        try { customerId = Long.valueOf(account.getFdAccountCustomerId()); }
        catch (NumberFormatException ex) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "FD account has an invalid customer reference"); }
        var customer = customerReports.customer(customerId);
        if (!customerId.equals(customer.customerId())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Customer report data does not match the FD account");
        }
        BigDecimal principal = txs.stream().filter(tx -> "DEPOSIT".equalsIgnoreCase(tx.getFdTransactionTxnType()))
                .findFirst().map(tx -> zero(tx.getFdTransactionAmount())).orElseGet(() -> zero(account.getFdAccountPrincipal()));
        BigDecimal penalty = zero(payout.getFdTransactionPenaltyAmount());
        BigDecimal gross = zero(payout.getFdTransactionAmount()).add(penalty);
        BigDecimal interest = gross.subtract(principal).max(BigDecimal.ZERO);
        if (gross.compareTo(principal) < 0) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Settlement payout is lower than the original principal");
        }
        String reportType = "WITHDRAWAL".equalsIgnoreCase(payout.getFdTransactionTxnType())
                ? "FD_PREMATURE_WITHDRAWAL" : "FD_MATURITY";
        return new FdMaturityReportDto(reportType, java.time.LocalDateTime.now(), customer, account(account),
                interestTransactions.findByFdInterestTransactionFdAccountNoOrderByFdInterestTransactionDateAsc(accountNo).stream()
                        .map(tx -> new FdMaturityReportDto.InterestTransaction(tx.getFdInterestTransactionId(),
                                tx.getFdInterestTransactionInterestAmount(), tx.getFdInterestTransactionDate(),
                                tx.getFdInterestTransactionStatus(), audit(tx))).toList(),
                txs.stream().map(tx -> new FdMaturityReportDto.Transaction(tx.getFdTransactionId(), tx.getFdTransactionTxnType(),
                        tx.getFdTransactionTxnDate(), tx.getFdTransactionAmount(), tx.getFdTransactionPenaltyAmount(),
                        tx.getFdTransactionRemarks(), audit(tx))).toList(),
                new FdMaturityReportDto.Maturity(payout.getFdTransactionId(), payout.getFdTransactionTxnDate(), gross,
                        principal, interest, penalty, payout.getFdTransactionAmount(), account.getFdAccountClosedAt()),
                notifications.findByNotificationLogFdAccountNo(accountNo).stream().map(note -> new FdMaturityReportDto.Notification(
                        note.getNotificationLogId(), note.getNotificationLogNotificationType(), note.getNotificationLogChannel(),
                        mask(note.getNotificationLogRecipient()), note.getNotificationLogStatus(), note.getNotificationLogSentAt(),
                        note.getNotificationLogErrorMessage(), note.getMaturityAmount(), note.getMaturityDate())).toList());
    }

    public String accountCustomerId(String accountNo) {
        return accounts.findById(accountNo).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "FD account not found")).getFdAccountCustomerId();
    }

    private FdMaturityReportDto.Account account(FixedDepositAccountEntity account) {
        return new FdMaturityReportDto.Account(account.getFdAccountNo(), account.getFdAccountCustomerId(),
                account.getFdAccountProductCode(), account.getFdAccountCurrency(), account.getFdAccountPrincipal(),
                account.getFdAccountRate(), account.getFdAccountTerm(), account.getFdAccountOpenedAt(),
                account.getFdAccountMaturityDate(), account.getFdAccountInterestType(), account.getFdAccountInterestPayoutType(),
                account.getFdAccountInterestFrequency(), account.getFdAccountStatus(), account.getFdAccountClosedAt(),
                account.getFdAccountAccruedInterest());
    }
    private FdMaturityReportDto.Audit audit(com.BankingTech.demo.entity.AuditEntity entity) {
        return new FdMaturityReportDto.Audit(entity.getCrudValue(), entity.getUserId(), entity.getWsId(), entity.getRuleSystemId(),
                entity.getAcptTs(), entity.getUuid() == null ? null : entity.getUuid().toString());
    }
    private BigDecimal zero(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private String mask(String value) {
        if (value == null || value.isBlank()) return null;
        int visible = Math.min(4, value.length());
        return "X".repeat(Math.max(0, value.length() - visible)) + value.substring(value.length() - visible);
    }

    private BigDecimal sumPrincipal(List<FixedDepositAccountEntity> items) { return items.stream().map(FixedDepositAccountEntity::getFdAccountPrincipal).reduce(BigDecimal.ZERO, BigDecimal::add); }
    private BigDecimal sumAccrued(List<FixedDepositAccountEntity> items) { return items.stream().map(FixedDepositAccountEntity::getFdAccountAccruedInterest).reduce(BigDecimal.ZERO, BigDecimal::add); }
}
