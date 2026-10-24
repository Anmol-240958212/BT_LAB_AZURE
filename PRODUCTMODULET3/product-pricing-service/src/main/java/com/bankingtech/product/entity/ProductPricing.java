package com.bankingtech.product.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.PricingType;
import com.bankingtech.product.entity.enums.RecordStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Table {@code product_pricing} - one pricing record per product, per
 * pricing type, per effective date (UNIQUE product_id, pricing_type,
 * effective_from). The base rate ({@link InterestRate}) and the tiered grid
 * ({@link RateMatrix}) hang off it, cascading exactly like their
 * ON DELETE CASCADE foreign keys.
 */
@Entity
@Table(name = "product_pricing",
       uniqueConstraints = @UniqueConstraint(name = "uq_pricing_product_type_from",
                                             columnNames = {"product_id", "pricing_type", "effective_from"}))
public class ProductPricing extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pricing_id")
    private Long pricingId;

    /** FK product_id -> product (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_pricing_product"))
    private Product product;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "pricing_type", nullable = false, length = 30)
    private PricingType pricingType = PricingType.STANDARD;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 30)
    private RecordStatus status = RecordStatus.ACTIVE;

    @OneToMany(mappedBy = "pricing", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InterestRate> interestRates = new ArrayList<>();

    @OneToMany(mappedBy = "pricing", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RateMatrix> rateMatrices = new ArrayList<>();

    public ProductPricing() {
    }

    public ProductPricing(PricingType pricingType, LocalDate effectiveFrom) {
        this.pricingType = pricingType;
        this.effectiveFrom = effectiveFrom;
    }

    // ---- relationship helpers ----

    public void addInterestRate(InterestRate interestRate) {
        interestRates.add(interestRate);
        interestRate.setPricing(this);
    }

    public void removeInterestRate(InterestRate interestRate) {
        interestRates.remove(interestRate);
        interestRate.setPricing(null);
    }

    public void addRateMatrix(RateMatrix rateMatrix) {
        rateMatrices.add(rateMatrix);
        rateMatrix.setPricing(this);
    }

    public void removeRateMatrix(RateMatrix rateMatrix) {
        rateMatrices.remove(rateMatrix);
        rateMatrix.setPricing(null);
    }

    // ---- getters / setters ----

    public Long getPricingId() {
        return pricingId;
    }

    public void setPricingId(Long pricingId) {
        this.pricingId = pricingId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public PricingType getPricingType() {
        return pricingType;
    }

    public void setPricingType(PricingType pricingType) {
        this.pricingType = pricingType;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
    }

    public void setEffectiveFrom(LocalDate effectiveFrom) {
        this.effectiveFrom = effectiveFrom;
    }

    public LocalDate getEffectiveTo() {
        return effectiveTo;
    }

    public void setEffectiveTo(LocalDate effectiveTo) {
        this.effectiveTo = effectiveTo;
    }

    public RecordStatus getStatus() {
        return status;
    }

    public void setStatus(RecordStatus status) {
        this.status = status;
    }

    public List<InterestRate> getInterestRates() {
        return interestRates;
    }

    public List<RateMatrix> getRateMatrices() {
        return rateMatrices;
    }

    @Override
    public String toString() {
        return "ProductPricing{pricingId=" + pricingId + ", pricingType=" + pricingType
                + ", effectiveFrom=" + effectiveFrom + ", effectiveTo=" + effectiveTo
                + ", status=" + status + "}";
    }
}
