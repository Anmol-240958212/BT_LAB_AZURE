package com.BankingTech.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.BankingTech.demo.dto.responsedto.FDTransactionResponseDTO;

public interface FDTransactionService {

    void recordTransaction(
            String fdAccountNo,
            String transactionType,
            BigDecimal amount,
            BigDecimal penaltyAmount,
            LocalDateTime transactionDate,
            String remarks);

    List<FDTransactionResponseDTO> getTransactions(String fdAccountNo);
}
