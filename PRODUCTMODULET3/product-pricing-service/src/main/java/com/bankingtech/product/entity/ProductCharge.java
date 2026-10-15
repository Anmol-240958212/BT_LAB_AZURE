package com.bankingtech.product.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.CalculationType;
import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.RecordStatus;

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
import jakarta.persistence.UniqueConstraint;

/**
 * Table {@code product_charge} - junction between {@link Product} and
 * {@link Charge} carrying the product-specific price of the charge:
 * <pre>
 *   calculationType = FLAT        -> amount     (e.g. 200.00, currency of the product unless set)
 *   calculationType = PERCENTAGE  -> percentage (e.g. 10.0000 % TDS)
 * </pre>
 * The database enforces "the matching column is filled" with
 * {@code chk_product_charge_value_for_type}; the two factories below do the
 * same on the Java side.
 * <p>
 * UNIQUE (product_id, charge_id, effective_from): the same charge can be
 * re-priced for a later date, but not assigned twice on the same date.
 */
@Entity
@Table(name = "product_charge",
       uniqueConstraints = @UniqueConstraint(name = "uq_product_charge_from",
                                             columnNames = {"product_id", "charge_id", "effective_from"}),
       indexes = @Index(name = "idx_product_charge_charge_id", columnList = "charge_id"))
public class ProductCharge extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_charge_id")
    private Long productChargeId;

    /** FK product_id -> product (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_product_charge_product"))
    private Product product;

    /** FK charge_id -> charge (ON DELETE RESTRICT - charge is a master row). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_product_charge_charge"))
    private Charge charge;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "calculation_type", nullable = false, length = 30)
    private CalculationType calculationType;

    /** Used when calculationType == FLAT. */
    @Column(name = "amount", precision = 18, scale = 2)
    private BigDecimal amount;

    /** Used when calculationType == PERCENTAGE (0 - 100). */
    @Column(name = "percentage", precision = 8, scale = 4)
    private BigDecimal percentage;

    /** NULL means "the product's currency". */
    @Column(name = "currency_code", columnDefinition = "CHAR(3)")
    private String currencyCode;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "frequency", length = 30)
    private Frequency frequency;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 30)
    private RecordStatus status = RecordStatus.ACTIVE;

    public ProductCharge() {
    }

    // ---- factories: the right value column is always the one that is set ----

    public static ProductCharge flat(Charge charge, BigDecimal amount, Frequency frequency,
                                     LocalDate effectiveFrom) {
        ProductCharge pc = new ProductCharge();
        pc.charge = charge;
        pc.calculationType = CalculationType.FLAT;
        pc.amount = amount;
        pc.frequency = frequency;
        pc.effectiveFrom = effectiveFrom;
        return pc;
    }

    public static ProductCharge percentage(Charge charge, BigDecimal percentage, Frequency frequency,
                                           LocalDate effectiveFrom) {
        ProductCharge pc = new ProductCharge();
        pc.charge = charge;
        pc.calculationType = CalculationType.PERCENTAGE;
        pc.percentage = percentage;
        pc.frequency = frequency;
        pc.effectiveFrom = effectiveFrom;
        return pc;
    }

    // ---- getters / setters ----

    public Long getProductChargeId() {
        return productChargeId;
    }

    public void setProductChargeId(Long productChargeId) {
        this.productChargeId = productChargeId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Charge getCharge() {
        return charge;
    }

    public void setCharge(Charge charge) {
        this.charge = charge;
    }

    public CalculationType getCalculationType() {
        return calculationType;
    }

    public void setCalculationType(CalculationType calculationType) {
        this.calculationType = calculationType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getPercentage() {
        return percentage;
    }

    public void setPercentage(BigDecimal percentage) {
        this.percentage = percentage;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
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

    public RecordStatus getStatus() {
        return status;
    }

    public void setStatus(RecordStatus status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "ProductCharge{productChargeId=" + productChargeId
                + ", calculationType=" + calculationType + ", amount=" + amount
                + ", percentage=" + percentage + ", frequency=" + frequency
                + ", status=" + status + "}";
    }
}
