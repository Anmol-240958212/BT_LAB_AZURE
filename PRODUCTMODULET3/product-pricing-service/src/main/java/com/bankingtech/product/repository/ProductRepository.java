package com.bankingtech.product.repository;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import com.bankingtech.product.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByProductCodeIgnoreCase(String productCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where upper(p.productCode) = upper(:productCode)")
    Optional<Product> findByProductCodeIgnoreCaseForUpdate(@Param("productCode") String productCode);

    boolean existsByProductCodeIgnoreCase(String productCode);

    @Query("""
            select p from Product p
            where (:typeCode is null or upper(p.productType.typeCode) = upper(:typeCode))
              and (:startDate is null or p.effectiveFrom >= :startDate)
              and (:endDate is null or p.effectiveFrom <= :endDate)
              and (:status is null or p.status = :status)
            order by p.productName asc, p.productCode asc
            """)
    Page<Product> search(@Param("typeCode") String typeCode,
                         @Param("startDate") LocalDate startDate,
                         @Param("endDate") LocalDate endDate,
                         @Param("status") com.bankingtech.product.entity.enums.RecordStatus status,
                         Pageable pageable);
}
