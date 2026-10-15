package com.bankingtech.product.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.ProductTypeMaster;

public interface ProductTypeMasterRepository extends JpaRepository<ProductTypeMaster, Long> {
    Optional<ProductTypeMaster> findByTypeCodeIgnoreCase(String typeCode);
}
