package com.BankingTech.demo.repository;

import com.BankingTech.demo.entity.FDTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FDTransactionRepository
        extends JpaRepository<FDTransactionEntity, String> {
    List<FDTransactionEntity> findByFdTransactionFdAccountNoOrderByFdTransactionTxnDateDesc(String fdAccountNo);
    List<FDTransactionEntity> findByFdTransactionFdAccountNoOrderByFdTransactionTxnDateAsc(String fdAccountNo);
    java.util.Optional<FDTransactionEntity> findFirstByFdTransactionFdAccountNoAndFdTransactionTxnTypeOrderByFdTransactionTxnDateAsc(
            String fdAccountNo, String txnType);
}
