package com.BankingTech.demo.service.serviceimpl;

import com.BankingTech.demo.repository.FixedDepositAccountRepository;
import com.BankingTech.demo.service.EmailNotificationService;
import com.BankingTech.demo.service.FDTransactionService;
import com.BankingTech.demo.service.InterestCalculationService;
import com.BankingTech.demo.service.MaturityProcessingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class MaturityProcessingServiceImpl implements MaturityProcessingService {
    private static final Logger LOGGER = LoggerFactory.getLogger(MaturityProcessingServiceImpl.class);
    private final FixedDepositAccountRepository accounts;
    private final FDTransactionService transactions;
    private final EmailNotificationService notifications;
    private final InterestCalculationService interest;
    private final TransactionTemplate transaction;

    public MaturityProcessingServiceImpl(FixedDepositAccountRepository accounts, FDTransactionService transactions,
            EmailNotificationService notifications, InterestCalculationService interest,
            PlatformTransactionManager transactionManager) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.notifications = notifications;
        this.interest = interest;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public void processMaturedAccounts(LocalDate businessDate) {
        if (businessDate == null) { throw new IllegalArgumentException("Business date is required"); }
        for (var candidate : accounts.findByFdAccountStatusAndFdAccountMaturityDateLessThanEqual("ACTIVE", businessDate)) {
            try {
                Settlement settlement = transaction.execute(status -> {
                    var fd = accounts.findForMaturity(candidate.getFdAccountNo()).orElseThrow();
                    if (!"ACTIVE".equals(fd.getFdAccountStatus()) || fd.getFdAccountMaturityDate().isAfter(businessDate)) {
                        return null;
                    }

                    // Always include the final partial interest period before closing. This makes a
                    // date-adjusted account behave exactly like a naturally matured account.
                    interest.calculateInterestForAccount(fd.getFdAccountNo(), businessDate);
                    fd = accounts.findForMaturity(candidate.getFdAccountNo()).orElseThrow();
                    var accrued = fd.getFdAccountAccruedInterest() == null ? BigDecimal.ZERO : fd.getFdAccountAccruedInterest();
                    var payout = fd.getFdAccountPrincipal().add(accrued);
                    transactions.recordTransaction(fd.getFdAccountNo(), "MATURITY_PAYOUT", payout, BigDecimal.ZERO,
                            LocalDateTime.now(), "Maturity payout on " + businessDate);
                    fd.setFdAccountStatus("CLOSED");
                    fd.setFdAccountClosedAt(LocalDateTime.now());
                    fd.setFdAccountAccruedInterest(BigDecimal.ZERO);
                    accounts.save(fd);
                    return new Settlement(fd.getFdAccountCustomerId(), fd.getFdAccountNo(), payout,
                            fd.getFdAccountMaturityDate());
                });
                if (settlement != null) {
                    try {
                        // Notifications are deliberately queued after the financial settlement commits.
                        // A missing contact or a transient mail/Kafka issue must never keep a matured FD open.
                        notifications.queueMaturityNotification(settlement.customerId(), settlement.accountNo(),
                                settlement.payout(), settlement.maturityDate());
                    } catch (Exception notificationFailure) {
                        LOGGER.error("FD {} settled but its maturity notification could not be queued",
                                settlement.accountNo(), notificationFailure);
                    }
                }
            } catch (Exception failure) {
                LOGGER.error("Maturity rolled back for FD {}", candidate.getFdAccountNo(), failure);
            }
        }
    }

    private record Settlement(String customerId, String accountNo, BigDecimal payout, LocalDate maturityDate) {}
}
