package com.BankingTech.demo.service;

import com.BankingTech.demo.entity.FDInterestTransactionEntity;
import com.BankingTech.demo.entity.FixedDepositAccountEntity;
import com.BankingTech.demo.repository.FDInterestTransactionRepository;
import com.BankingTech.demo.repository.FixedDepositAccountRepository;
import com.BankingTech.demo.service.plugins.calculator.CompoundInterestCalculator;
import com.BankingTech.demo.service.plugins.calculator.SimpleInterestCalculator;
import com.BankingTech.demo.service.serviceimpl.InterestCalculationServiceImpl;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class InterestCalculationBackfillTest {
    @Test
    void backfillsOneMonthlyPostingForEachMissedMonth() {
        FixedDepositAccountRepository accounts = mock(FixedDepositAccountRepository.class);
        FDInterestTransactionRepository interestTransactions = mock(FDInterestTransactionRepository.class);
        FDStatementService statements = mock(FDStatementService.class);
        FixedDepositAccountEntity account = new FixedDepositAccountEntity();
        account.setFdAccountNo("FD-BACKFILL-001");
        account.setFdAccountStatus("ACTIVE");
        account.setFdAccountOpenedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
        account.setFdAccountMaturityDate(LocalDate.of(2027, 1, 1));
        account.setFdAccountPrincipal(new BigDecimal("12000"));
        account.setFdAccountRate(new BigDecimal("12"));
        account.setFdAccountInterestType("SIMPLE");
        account.setFdAccountInterestPayoutType("MATURITY");
        account.setFdAccountInterestFrequency("MONTHLY");
        account.setFdAccountAccruedInterest(BigDecimal.ZERO);
        when(accounts.findByFdAccountNo("FD-BACKFILL-001")).thenReturn(Optional.of(account));
        when(interestTransactions.findByFdInterestTransactionFdAccountNoOrderByFdInterestTransactionDateDesc("FD-BACKFILL-001"))
                .thenReturn(List.of());

        InterestCalculationService service = new InterestCalculationServiceImpl(
                accounts, interestTransactions, new SimpleInterestCalculator(), new CompoundInterestCalculator(), statements);
        service.calculateInterestForAccount("FD-BACKFILL-001", LocalDate.of(2026, 6, 1));

        ArgumentCaptor<FDInterestTransactionEntity> postings = ArgumentCaptor.forClass(FDInterestTransactionEntity.class);
        verify(interestTransactions, times(5)).save(postings.capture());
        assertEquals(List.of(
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 1), LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 6, 1)),
                postings.getAllValues().stream()
                        .map(posting -> posting.getFdInterestTransactionDate().toLocalDate()).toList());
        verify(statements, times(5)).generateStatement(eq("FD-BACKFILL-001"), any(LocalDate.class));
    }
}
