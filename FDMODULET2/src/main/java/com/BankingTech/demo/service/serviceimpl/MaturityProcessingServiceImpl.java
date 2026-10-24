package com.BankingTech.demo.service.serviceimpl;

import com.BankingTech.demo.repository.FixedDepositAccountRepository;
import com.BankingTech.demo.service.EmailNotificationService;
import com.BankingTech.demo.service.FDTransactionService;
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
    private final TransactionTemplate transaction;

    public MaturityProcessingServiceImpl(FixedDepositAccountRepository accounts, FDTransactionService transactions,
            EmailNotificationService notifications, PlatformTransactionManager transactionManager) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.notifications = notifications;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public void processMaturedAccounts(LocalDate businessDate) {
        if (businessDate == null) { throw new IllegalArgumentException("Business date is required"); }
        for (var candidate : accounts.findByFdAccountStatusAndFdAccountMaturityDateLessThanEqual("ACTIVE", businessDate)) {
            try {
                transaction.executeWithoutResult(status -> {
                    var fd = accounts.findForMaturity(candidate.getFdAccountNo()).orElseThrow();
                    if (!"ACTIVE".equals(fd.getFdAccountStatus()) || fd.getFdAccountMaturityDate().isAfter(businessDate)) {
                        return;
                    }
                    var accrued = fd.getFdAccountAccruedInterest() == null ? BigDecimal.ZERO : fd.getFdAccountAccruedInterest();
                    var payout = fd.getFdAccountPrincipal().add(accrued);
                    transactions.recordTransaction(fd.getFdAccountNo(), "MATURITY_PAYOUT", payout, BigDecimal.ZERO,
                            LocalDateTime.now(), "Maturity payout on " + businessDate);
                    fd.setFdAccountStatus("CLOSED");
                    fd.setFdAccountClosedAt(LocalDateTime.now());
                    fd.setFdAccountAccruedInterest(BigDecimal.ZERO);
                    accounts.save(fd);
                    notifications.queueMaturityNotification(fd.getFdAccountCustomerId(), fd.getFdAccountNo(),
                            payout, fd.getFdAccountMaturityDate());
                });
            } catch (Exception failure) {
                LOGGER.error("Maturity rolled back for FD {}", candidate.getFdAccountNo(), failure);
            }
        }
    }
}
