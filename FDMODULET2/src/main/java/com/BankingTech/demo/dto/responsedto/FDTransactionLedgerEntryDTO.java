package com.BankingTech.demo.dto.responsedto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Read-only transaction journal entry exposed to administrators. */
public record FDTransactionLedgerEntryDTO(
        String transactionId,
        String fdAccountNo,
        String customerId,
        String currency,
        String transactionType,
        BigDecimal amount,
        BigDecimal penaltyAmount,
        LocalDateTime transactionDate,
        String remarks) {
}
