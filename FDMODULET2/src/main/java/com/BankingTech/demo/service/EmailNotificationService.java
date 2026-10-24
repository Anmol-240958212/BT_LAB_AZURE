package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import java.math.BigDecimal;
import java.time.LocalDate;

public interface EmailNotificationService {
    void queueMaturityNotification(String customerId, String fdAccountNo, BigDecimal amount, LocalDate maturityDate);
    void queuePrematureWithdrawalNotification(String customerId, String fdAccountNo, BigDecimal payout,
            BigDecimal penalty, LocalDate withdrawalDate);
    void deliverMaturityNotification(FdMaturityEventDto event);
}
