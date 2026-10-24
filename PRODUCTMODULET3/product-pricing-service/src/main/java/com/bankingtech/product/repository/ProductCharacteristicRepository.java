package com.bankingtech.product.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.ProductCharacteristic;

public interface ProductCharacteristicRepository extends JpaRepository<ProductCharacteristic, Long> {
    List<ProductCharacteristic> findAllByProductProductId(Long productId);

    Optional<ProductCharacteristic> findByProductProductIdAndCharacteristicNameIgnoreCase(
            Long productId, String characteristicName);
}
