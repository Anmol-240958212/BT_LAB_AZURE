package com.BankingTech.demo.service.serviceimpl;

import com.BankingTech.demo.entity.FDTransactionEntity;
import com.BankingTech.demo.repository.FDTransactionRepository;
import com.BankingTech.demo.service.FDTransactionService;
import com.BankingTech.demo.dto.responsedto.FDTransactionResponseDTO;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FDTransactionServiceImpl
                implements FDTransactionService {

        private final FDTransactionRepository fdTransactionRepository;

        public FDTransactionServiceImpl(
                        FDTransactionRepository fdTransactionRepository) {
                this.fdTransactionRepository = fdTransactionRepository;
        }

        @Override
        @Transactional
        public void recordTransaction(
                        String fdAccountNo,
                        String transactionType,
                        BigDecimal amount,
                        BigDecimal penaltyAmount,
                        LocalDateTime transactionDate,
                        String remarks) {

                FDTransactionEntity transaction = new FDTransactionEntity();

                transaction.setFdTransactionId(
                                generateTransactionId());

                transaction.setFdTransactionFdAccountNo(
                                fdAccountNo);

                transaction.setFdTransactionTxnType(
                                transactionType);

                transaction.setFdTransactionAmount(
                                amount);

                transaction.setFdTransactionPenaltyAmount(
                                penaltyAmount);

                transaction.setFdTransactionTxnDate(
                                transactionDate);

                transaction.setFdTransactionRemarks(
                                remarks);

                /*
                 * Audit information.
                 *
                 * Temporary values until authentication /
                 * user identity integration is completed.
                 */
                LocalDateTime now = LocalDateTime.now();

                transaction.setCrudValue(
                                "CREATE");

                transaction.setUserId(
                                "SYSTEM");

                transaction.setWsId(
                                "BANKING_SYSTEM");

                transaction.setHostTs(
                                now);

                transaction.setLocalTs(
                                now);

                transaction.setRuleSystemId(
                                "FD_TRANSACTION");

                transaction.setAcptTs(
                                now);

                transaction.setAcptTsUtcOfst(
                                java.time.ZoneOffset
                                                .systemDefault()
                                                .getRules()
                                                .getOffset(now)
                                                .toString());

                transaction.setUuid(
                                UUID.randomUUID());

                fdTransactionRepository.save(
                                transaction);
        }

        @Override
        @Transactional(readOnly = true)
        public List<FDTransactionResponseDTO> getTransactions(String fdAccountNo) {
                List<FDTransactionEntity> transactions = fdAccountNo == null || fdAccountNo.isBlank()
                                ? fdTransactionRepository.findAllByOrderByFdTransactionTxnDateDesc()
                                : fdTransactionRepository
                                                .findByFdTransactionFdAccountNoOrderByFdTransactionTxnDateDesc(
                                                                fdAccountNo.trim());

                return transactions.stream().map(this::toResponse).toList();
        }

        private FDTransactionResponseDTO toResponse(FDTransactionEntity transaction) {
                FDTransactionResponseDTO response = new FDTransactionResponseDTO();
                response.setTransactionId(transaction.getFdTransactionId());
                response.setFdAccountNo(transaction.getFdTransactionFdAccountNo());
                response.setTxnType(transaction.getFdTransactionTxnType());
                response.setAmount(transaction.getFdTransactionAmount());
                response.setPenaltyAmount(transaction.getFdTransactionPenaltyAmount());
                response.setTxnDate(transaction.getFdTransactionTxnDate());
                response.setRemarks(transaction.getFdTransactionRemarks());
                return response;
        }

        private String generateTransactionId() {

                return "FDT-"
                                + UUID.randomUUID()
                                                .toString()
                                                .replace("-", "")
                                                .substring(0, 16)
                                                .toUpperCase();
        }
}
