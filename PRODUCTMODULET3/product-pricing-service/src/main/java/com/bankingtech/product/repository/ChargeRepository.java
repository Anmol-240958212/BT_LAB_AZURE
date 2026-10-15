package com.bankingtech.product.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bankingtech.product.entity.Charge;

public interface ChargeRepository extends JpaRepository<Charge, Long> {
    Optional<Charge> findByChargeCodeIgnoreCase(String chargeCode);
}
