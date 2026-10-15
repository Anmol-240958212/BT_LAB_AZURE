package com.bankingtech.product.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.InterestRate;

public interface InterestRateRepository extends JpaRepository<InterestRate, Long> {
    List<InterestRate> findAllByPricingPricingIdAndEffectiveFromLessThanEqual(
            Long pricingId, LocalDate date);
}
