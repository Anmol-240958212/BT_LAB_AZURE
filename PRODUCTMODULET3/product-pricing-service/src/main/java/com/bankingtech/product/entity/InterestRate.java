package com.bankingtech.product.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.RateType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Table {@code interest_rate} - the base (card) rate of a pricing record.
 * This is the "base rate" the FD Calculator group fetches in Lab L6; the
 * category-pricing rules in {@link ProductRule} are stacked on top of it.
 * <p>
 * {@code rate} is an annual percentage stored as DECIMAL(8,4), e.g. 6.7500,
 * and the database checks {@code 0 <= rate <= 100}.
 */
@Entity
@Table(name = "interest_rate",
       indexes = @Index(name = "idx_interest_rate_pricing_id", columnList = "pricing_id"))
public class InterestRate extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interest_rate_id")
    private Long interestRateId;

    /** FK pricing_id -> product_pricing (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pricing_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_interest_rate_pricing"))
    private ProductPricing pricing;

    /** Annual rate in percent - never a double, money math needs BigDecimal. */
    @Column(name = "rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal rate;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "rate_type", nullable = false, length = 30)
    private RateType rateType;

    /** Compounding / payout frequency; optional for SIMPLE interest. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "frequency", length = 30)
    private Frequency frequency;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    public InterestRate() {
    }

    public InterestRate(BigDecimal rate, RateType rateType, Frequency frequency, LocalDate effectiveFrom) {
        this.rate = rate;
        this.rateType = rateType;
        this.frequency = frequency;
        this.effectiveFrom = effectiveFrom;
    }

    public Long getInterestRateId() {
        return interestRateId;
    }

    public void setInterestRateId(Long interestRateId) {
        this.interestRateId = interestRateId;
    }

    public ProductPricing getPricing() {
        return pricing;
    }

    public void setPricing(ProductPricing pricing) {
        this.pricing = pricing;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
    }

    public RateType getRateType() {
        return rateType;
    }

    public void setRateType(RateType rateType) {
        this.rateType = rateType;
    }

    public Frequency getFrequency() {
        return frequency;
    }

    public void setFrequency(Frequency frequency) {
        this.frequency = frequency;
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

    @Override
    public String toString() {
        return "InterestRate{interestRateId=" + interestRateId + ", rate=" + rate
                + ", rateType=" + rateType + ", frequency=" + frequency
                + ", effectiveFrom=" + effectiveFrom + ", effectiveTo=" + effectiveTo + "}";
    }
}
