package com.bankingtech.product.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.ProductRule;
import com.bankingtech.product.entity.enums.RecordStatus;

public interface ProductRuleRepository extends JpaRepository<ProductRule, Long> {
    boolean existsByProductProductIdAndRuleCodeIgnoreCase(Long productId, String ruleCode);

    List<ProductRule> findAllByProductProductIdAndRuleType(Long productId, String ruleType);

    List<ProductRule> findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
            Long productId, String ruleType, RecordStatus status, LocalDate date);
}
