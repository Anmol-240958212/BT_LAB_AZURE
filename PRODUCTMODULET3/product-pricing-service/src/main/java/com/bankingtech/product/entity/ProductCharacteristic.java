package com.bankingtech.product.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.CharacteristicDataType;

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
 * Table {@code product_characteristic} - EAV (entity-attribute-value) row.
 * Every product attribute is a row instead of a column, so adding a new
 * attribute (say MIN_CREDIT_SCORE) is an INSERT, not an ALTER TABLE.
 * <p>
 * Exactly one value column is used, chosen by {@link #dataType}:
 * <pre>
 *   TEXT        -> valueText
 *   NUMBER      -> valueNumber
 *   PERCENTAGE  -> valuePercentage
 *   AMOUNT      -> valueAmount + currencyCode
 * </pre>
 * The database enforces this with {@code chk_characteristic_value_for_type};
 * the static factory methods below make it impossible to build an
 * inconsistent object from Java.
 * <p>
 * UNIQUE (product_id, characteristic_name): a product carries each attribute
 * at most once.
 */
@Entity
@Table(name = "product_characteristic",
       uniqueConstraints = @UniqueConstraint(name = "uq_characteristic_product_name",
                                             columnNames = {"product_id", "characteristic_name"}),
       indexes = @Index(name = "idx_characteristic_name", columnList = "characteristic_name"))
public class ProductCharacteristic extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "characteristic_id")
    private Long characteristicId;

    /** FK product_id -> product (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_characteristic_product"))
    private Product product;

    /** e.g. TERM_MIN_MONTHS, TERM_MAX_MONTHS, RATE_MIN, RATE_MAX, AMOUNT_MIN, AMOUNT_MAX */
    @Column(name = "characteristic_name", nullable = false, length = 100)
    private String characteristicName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "data_type", nullable = false, length = 20)
    private CharacteristicDataType dataType;

    @Column(name = "value_text", length = 255)
    private String valueText;

    @Column(name = "value_number", precision = 18, scale = 4)
    private BigDecimal valueNumber;

    @Column(name = "value_percentage", precision = 8, scale = 4)
    private BigDecimal valuePercentage;

    @Column(name = "value_amount", precision = 18, scale = 2)
    private BigDecimal valueAmount;

    /** Required when dataType == AMOUNT. */
    @Column(name = "currency_code", columnDefinition = "CHAR(3)")
    private String currencyCode;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    public ProductCharacteristic() {
    }

    // ---- factories: one per data type, so the right value column is always set ----

    public static ProductCharacteristic ofText(String name, String value, LocalDate effectiveFrom) {
        ProductCharacteristic c = new ProductCharacteristic();
        c.characteristicName = name;
        c.dataType = CharacteristicDataType.TEXT;
        c.valueText = value;
        c.effectiveFrom = effectiveFrom;
        return c;
    }

    public static ProductCharacteristic ofNumber(String name, BigDecimal value, LocalDate effectiveFrom) {
        ProductCharacteristic c = new ProductCharacteristic();
        c.characteristicName = name;
        c.dataType = CharacteristicDataType.NUMBER;
        c.valueNumber = value;
        c.effectiveFrom = effectiveFrom;
        return c;
    }

    public static ProductCharacteristic ofPercentage(String name, BigDecimal value, LocalDate effectiveFrom) {
        ProductCharacteristic c = new ProductCharacteristic();
        c.characteristicName = name;
        c.dataType = CharacteristicDataType.PERCENTAGE;
        c.valuePercentage = value;
        c.effectiveFrom = effectiveFrom;
        return c;
    }

    public static ProductCharacteristic ofAmount(String name, BigDecimal value, String currencyCode,
                                                 LocalDate effectiveFrom) {
        ProductCharacteristic c = new ProductCharacteristic();
        c.characteristicName = name;
        c.dataType = CharacteristicDataType.AMOUNT;
        c.valueAmount = value;
        c.currencyCode = currencyCode;
        c.effectiveFrom = effectiveFrom;
        return c;
    }

    // ---- getters / setters ----

    public Long getCharacteristicId() {
        return characteristicId;
    }

    public void setCharacteristicId(Long characteristicId) {
        this.characteristicId = characteristicId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getCharacteristicName() {
        return characteristicName;
    }

    public void setCharacteristicName(String characteristicName) {
        this.characteristicName = characteristicName;
    }

    public CharacteristicDataType getDataType() {
        return dataType;
    }

    public void setDataType(CharacteristicDataType dataType) {
        this.dataType = dataType;
    }

    public String getValueText() {
        return valueText;
    }

    public void setValueText(String valueText) {
        this.valueText = valueText;
    }

    public BigDecimal getValueNumber() {
        return valueNumber;
    }

    public void setValueNumber(BigDecimal valueNumber) {
        this.valueNumber = valueNumber;
    }

    public BigDecimal getValuePercentage() {
        return valuePercentage;
    }

    public void setValuePercentage(BigDecimal valuePercentage) {
        this.valuePercentage = valuePercentage;
    }

    public BigDecimal getValueAmount() {
        return valueAmount;
    }

    public void setValueAmount(BigDecimal valueAmount) {
        this.valueAmount = valueAmount;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
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
        return "ProductCharacteristic{characteristicId=" + characteristicId
                + ", name='" + characteristicName + "', dataType=" + dataType
                + ", valueText='" + valueText + "', valueNumber=" + valueNumber
                + ", valuePercentage=" + valuePercentage + ", valueAmount=" + valueAmount
                + ", currencyCode='" + currencyCode + "'}";
    }
}
