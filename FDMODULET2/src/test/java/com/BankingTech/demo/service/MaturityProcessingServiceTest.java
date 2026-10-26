package com.BankingTech.demo.service;

import com.BankingTech.demo.entity.FixedDepositAccountEntity;
import com.BankingTech.demo.repository.FixedDepositAccountRepository;
import com.BankingTech.demo.service.serviceimpl.MaturityProcessingServiceImpl;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MaturityProcessingServiceTest {
    @Test
    void settlesAnAccountWhoseAdjustedMaturityDateIsToday() {
        LocalDate today = LocalDate.now();
        var account = activeAccount(today);
        var accounts = mock(FixedDepositAccountRepository.class);
        var transactions = mock(FDTransactionService.class);
        var notifications = mock(EmailNotificationService.class);
        var interest = mock(InterestCalculationService.class);
        var manager = transactionManager();
        when(accounts.findByFdAccountStatusAndFdAccountMaturityDateLessThanEqual("ACTIVE", today))
                .thenReturn(List.of(account));
        when(accounts.findForMaturity("0010000001")).thenReturn(Optional.of(account));

        new MaturityProcessingServiceImpl(accounts, transactions, notifications, interest, manager)
                .processMaturedAccounts(today);

        verify(interest).calculateInterestForAccount("0010000001", today);
        verify(transactions).recordTransaction(eq("0010000001"), eq("MATURITY_PAYOUT"),
                eq(new BigDecimal("10025.00")), eq(BigDecimal.ZERO), any(), eq("Maturity payout on " + today));
        verify(accounts).save(account);
        verify(notifications).queueMaturityNotification("17", "0010000001", new BigDecimal("10025.00"), today);
        assertEquals("CLOSED", account.getFdAccountStatus());
        assertEquals(BigDecimal.ZERO, account.getFdAccountAccruedInterest());
    }

    @Test
    void notificationFailureDoesNotReopenTheMaturedAccount() {
        LocalDate today = LocalDate.now();
        var account = activeAccount(today);
        var accounts = mock(FixedDepositAccountRepository.class);
        var transactions = mock(FDTransactionService.class);
        var notifications = mock(EmailNotificationService.class);
        var interest = mock(InterestCalculationService.class);
        when(accounts.findByFdAccountStatusAndFdAccountMaturityDateLessThanEqual("ACTIVE", today))
                .thenReturn(List.of(account));
        when(accounts.findForMaturity("0010000001")).thenReturn(Optional.of(account));
        doThrow(new IllegalStateException("mail unavailable")).when(notifications)
                .queueMaturityNotification(anyString(), anyString(), any(), any());

        new MaturityProcessingServiceImpl(accounts, transactions, notifications, interest, transactionManager())
                .processMaturedAccounts(today);

        verify(accounts).save(account);
        assertEquals("CLOSED", account.getFdAccountStatus());
    }

    private FixedDepositAccountEntity activeAccount(LocalDate maturityDate) {
        var account = new FixedDepositAccountEntity();
        account.setFdAccountNo("0010000001");
        account.setFdAccountCustomerId("17");
        account.setFdAccountPrincipal(new BigDecimal("10000.00"));
        account.setFdAccountAccruedInterest(new BigDecimal("25.00"));
        account.setFdAccountMaturityDate(maturityDate);
        account.setFdAccountStatus("ACTIVE");
        return account;
    }

    private PlatformTransactionManager transactionManager() {
        var manager = mock(PlatformTransactionManager.class);
        TransactionStatus status = new SimpleTransactionStatus();
        when(manager.getTransaction(any(TransactionDefinition.class))).thenReturn(status);
        return manager;
    }
}
