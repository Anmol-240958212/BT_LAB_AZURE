package com.bankingtech.product.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.DurationUnit;

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
 * Table {@code rate_matrix} - one cell of a tiered rate grid:
 * <pre>
 *   amount band   [min_amount, max_amount]
 *   duration band [duration_from, duration_to] duration_unit
 *   -> rate
 * </pre>
 * e.g. "Rs.1,000 - Rs.1,00,000 for 3-6 MONTHS earns 6.5000 %".
 * The database checks {@code min_amount <= max_amount},
 * {@code duration_from <= duration_to} and {@code 0 <= rate <= 100}.
 */
@Entity
@Table(name = "rate_matrix",
       indexes = @Index(name = "idx_rate_matrix_pricing_id", columnList = "pricing_id"))
public class RateMatrix extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rate_matrix_id")
    private Long rateMatrixId;

    /** FK pricing_id -> product_pricing (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pricing_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_rate_matrix_pricing"))
    private ProductPricing pricing;

    @Column(name = "min_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "max_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "duration_from", nullable = false)
    private Integer durationFrom;

    @Column(name = "duration_to", nullable = false)
    private Integer durationTo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "duration_unit", nullable = false, length = 20)
    private DurationUnit durationUnit = DurationUnit.MONTHS;

    @Column(name = "rate", nullable = false, precision = 8, scale = 4)
    private BigDecimal rate;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    public RateMatrix() {
    }

    public RateMatrix(BigDecimal minAmount, BigDecimal maxAmount,
                      Integer durationFrom, Integer durationTo, DurationUnit durationUnit,
                      BigDecimal rate, LocalDate effectiveFrom) {
        this.minAmount = minAmount;
        this.maxAmount = maxAmount;
        this.durationFrom = durationFrom;
        this.durationTo = durationTo;
        this.durationUnit = durationUnit;
        this.rate = rate;
        this.effectiveFrom = effectiveFrom;
    }

    /** Does this cell cover the given amount and term (same unit as {@link #durationUnit})? */
    public boolean matches(BigDecimal amount, int duration) {
        return amount.compareTo(minAmount) >= 0
                && amount.compareTo(maxAmount) <= 0
                && duration >= durationFrom
                && duration <= durationTo;
    }

    public Long getRateMatrixId() {
        return rateMatrixId;
    }

    public void setRateMatrixId(Long rateMatrixId) {
        this.rateMatrixId = rateMatrixId;
    }

    public ProductPricing getPricing() {
        return pricing;
    }

    public void setPricing(ProductPricing pricing) {
        this.pricing = pricing;
    }

    public BigDecimal getMinAmount() {
        return minAmount;
    }

    public void setMinAmount(BigDecimal minAmount) {
        this.minAmount = minAmount;
    }

    public BigDecimal getMaxAmount() {
        return maxAmount;
    }

    public void setMaxAmount(BigDecimal maxAmount) {
        this.maxAmount = maxAmount;
    }

    public Integer getDurationFrom() {
        return durationFrom;
    }

    public void setDurationFrom(Integer durationFrom) {
        this.durationFrom = durationFrom;
    }

    public Integer getDurationTo() {
        return durationTo;
    }

    public void setDurationTo(Integer durationTo) {
        this.durationTo = durationTo;
    }

    public DurationUnit getDurationUnit() {
        return durationUnit;
    }

    public void setDurationUnit(DurationUnit durationUnit) {
        this.durationUnit = durationUnit;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
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
        return "RateMatrix{rateMatrixId=" + rateMatrixId
                + ", amount=[" + minAmount + ", " + maxAmount + "]"
                + ", duration=[" + durationFrom + ", " + durationTo + "] " + durationUnit
                + ", rate=" + rate + "}";
    }
}
