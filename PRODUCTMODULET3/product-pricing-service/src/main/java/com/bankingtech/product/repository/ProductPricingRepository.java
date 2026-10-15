package com.bankingtech.product.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.ProductPricing;
import com.bankingtech.product.entity.enums.RecordStatus;

public interface ProductPricingRepository extends JpaRepository<ProductPricing, Long> {
    Optional<ProductPricing> findByProductProductIdAndPricingTypeAndEffectiveFrom(
            Long productId, com.bankingtech.product.entity.enums.PricingType pricingType, LocalDate effectiveFrom);

    List<ProductPricing> findAllByProductProductIdAndStatusAndEffectiveFromLessThanEqual(
            Long productId, RecordStatus status, LocalDate date);
}
