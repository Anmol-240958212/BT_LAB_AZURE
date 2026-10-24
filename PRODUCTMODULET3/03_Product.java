package com.bankingtech.product.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.enums.ProductStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Table {@code product} - the aggregate root of the module. Every FD / savings
 * account in the bank is opened against exactly one product, identified to the
 * other groups by {@code productCode} (FD001, SB001 ...), never by the numeric id.
 *
 * <p>Owns five child collections (characteristics, rules, pricings, charges,
 * notifications). They are mapped with {@code cascade = ALL, orphanRemoval = true},
 * so saving a Product saves its children and removing a child from a list deletes
 * its row - mirroring the ON DELETE CASCADE foreign keys in the schema. Always add
 * children through the {@code addXxx()} helpers so both sides of the relationship
 * stay in sync.
 */
@Entity
@Table(name = "product",
       uniqueConstraints = @UniqueConstraint(name = "uk_product_code", columnNames = "product_code"),
       indexes = {
           @Index(name = "idx_product_type_effective", columnList = "product_type_id, effective_from"),
           @Index(name = "idx_product_status", columnList = "status")
       })
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;

    /** Business key shared with the FD Calculator and FD Account groups. */
    @NotBlank
    @Size(max = 30)
    @Column(name = "product_code", nullable = false, length = 30, unique = true)
    private String productCode;

    @NotBlank
    @Size(max = 100)
    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    /** FK product_type_id -> product_type_master (ON DELETE RESTRICT). */
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_type_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_product_type"))
    private ProductTypeMaster productType;

    @Size(max = 255)
    @Column(name = "description", length = 255)
    private String description;

    /** ISO-4217 code, upper case (CHECK chk_product_currency). */
    @NotBlank
    @Pattern(regexp = "^[A-Z]{3}$", message = "currency code must be 3 upper-case letters, e.g. INR")
    @Column(name = "currency_code", nullable = false, columnDefinition = "CHAR(3)")
    private String currencyCode = "INR";

    /** Stored as VARCHAR(30); @JdbcTypeCode stops Hibernate 6 from expecting a native MySQL ENUM column. */
    @NotNull
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 30)
    private ProductStatus status = ProductStatus.ACTIVE;

    /** The lab manual's "effectiveDate". */
    @NotNull
    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    /** NULL = open-ended. */
    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    // ---------------------------------------------------------------- children

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductCharacteristic> characteristics = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductRule> rules = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductPricing> pricings = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductCharge> productCharges = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductNotification> notifications = new ArrayList<>();

    // ---------------------------------------------------------------- constructors

    /** Required by JPA. */
    protected Product() {
    }

    public Product(String productCode, String productName, ProductTypeMaster productType, LocalDate effectiveFrom) {
        this.productCode = productCode;
        this.productName = productName;
        this.productType = productType;
        this.effectiveFrom = effectiveFrom;
    }

    // ---------------------------------------------------------------- relationship helpers
    // Each helper sets BOTH sides so the in-memory object graph matches the FK.

    public void addCharacteristic(ProductCharacteristic characteristic) {
        characteristics.add(characteristic);
        characteristic.setProduct(this);
    }

    public void removeCharacteristic(ProductCharacteristic characteristic) {
        characteristics.remove(characteristic);
        characteristic.setProduct(null);
    }

    public void addRule(ProductRule rule) {
        rules.add(rule);
        rule.setProduct(this);
    }

    public void removeRule(ProductRule rule) {
        rules.remove(rule);
        rule.setProduct(null);
    }

    public void addPricing(ProductPricing pricing) {
        pricings.add(pricing);
        pricing.setProduct(this);
    }

    public void removePricing(ProductPricing pricing) {
        pricings.remove(pricing);
        pricing.setProduct(null);
    }

    public void addProductCharge(ProductCharge productCharge) {
        productCharges.add(productCharge);
        productCharge.setProduct(this);
    }

    public void removeProductCharge(ProductCharge productCharge) {
        productCharges.remove(productCharge);
        productCharge.setProduct(null);
    }

    public void addNotification(ProductNotification notification) {
        notifications.add(notification);
        notification.setProduct(this);
    }

    public void removeNotification(ProductNotification notification) {
        notifications.remove(notification);
        notification.setProduct(null);
    }

    // ---------------------------------------------------------------- validation (mirrors chk_product_effective)

    @AssertTrue(message = "effectiveTo must be on or after effectiveFrom")
    public boolean isEffectivePeriodValid() {
        return effectiveTo == null || effectiveFrom == null || !effectiveTo.isBefore(effectiveFrom);
    }

    /** True when the product is ACTIVE and {@code date} falls inside its validity window. */
    public boolean isLiveOn(LocalDate date) {
        return status == ProductStatus.ACTIVE
                && !date.isBefore(effectiveFrom)
                && (effectiveTo == null || !date.isAfter(effectiveTo));
    }

    // ---------------------------------------------------------------- getters / setters

    public Long getProductId() {
        return productId;
    }

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public ProductTypeMaster getProductType() {
        return productType;
    }

    public void setProductType(ProductTypeMaster productType) {
        this.productType = productType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public ProductStatus getStatus() {
        return status;
    }

    public void setStatus(ProductStatus status) {
        this.status = status;
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

    public List<ProductCharacteristic> getCharacteristics() {
        return characteristics;
    }

    public List<ProductRule> getRules() {
        return rules;
    }

    public List<ProductPricing> getPricings() {
        return pricings;
    }

    public List<ProductCharge> getProductCharges() {
        return productCharges;
    }

    public List<ProductNotification> getNotifications() {
        return notifications;
    }

    // ---------------------------------------------------------------- equals / hashCode / toString

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Product other)) {
            return false;
        }
        return productId != null && productId.equals(other.productId);
    }

    @Override
    public int hashCode() {
        return Product.class.hashCode();
    }

    /** Scalars only - never touch the lazy collections here. */
    @Override
    public String toString() {
        return "Product{id=" + productId + ", productCode='" + productCode + "', productName='" + productName
                + "', currencyCode='" + currencyCode + "', status=" + status
                + ", effectiveFrom=" + effectiveFrom + ", effectiveTo=" + effectiveTo + "}";
    }
}
