package com.bankingtech.product.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.RateMatrix;

public interface RateMatrixRepository extends JpaRepository<RateMatrix, Long> {
    List<RateMatrix> findAllByPricingPricingId(Long pricingId);
}
