package com.BankingTech.demo.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.BankingTech.demo.entity.FdProductCatalogue;
public interface FdProductCatalogueRepository extends JpaRepository<FdProductCatalogue, String> {}
