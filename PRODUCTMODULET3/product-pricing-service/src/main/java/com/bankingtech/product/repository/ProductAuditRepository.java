package com.bankingtech.product.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.ProductAuditEvent;

public interface ProductAuditRepository extends JpaRepository<ProductAuditEvent, Long> {
}
