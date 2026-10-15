package com.bankingtech.product.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Table {@code product} - the hub of the module. Every FD / savings account
 * the other groups create is derived from one row here; they reference it by
 * the business key {@code product_code} (UNIQUE), never by the numeric id.
 * <p>
 * The five {@code @OneToMany} collections mirror the ON DELETE CASCADE foreign
 * keys in the schema: characteristics, rules, pricing, charges and
 * notifications have no meaning without their product, so JPA cascades
 * persist / remove to them ({@code orphanRemoval = true} deletes a child
 * that is removed from the list).
 */
@Entity
@Table(name = "product",
       uniqueConstraints = @UniqueConstraint(name = "uq_product_code", columnNames = "product_code"),
       indexes = {
           @Index(name = "idx_product_type_id",        columnList = "product_type_id"),
           @Index(name = "idx_product_effective_from", columnList = "effective_from"),
           @Index(name = "idx_product_status",         columnList = "status")
       })
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;

    /** Business key, e.g. "FD001". Used by the FD Account group as their FK. */
    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    /** FK product_type_id -> product_type_master (ON DELETE RESTRICT). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_type_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_product_product_type"))
    private ProductTypeMaster productType;

    /** ISO 4217 code; CHAR(3) in MySQL, default 'INR'. */
    @Column(name = "currency_code", nullable = false, columnDefinition = "CHAR(3)")
    private String currencyCode = "INR";

    @Column(name = "description", length = 255)
    private String description;

    /**
     * Soft-delete flag. {@code @JdbcTypeCode(VARCHAR)} keeps Hibernate 6 from
     * expecting a native MySQL ENUM column, so it validates cleanly against
     * the VARCHAR(30) declared in V1__init_schema.sql.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 30)
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    /** NULL = still in force. */
    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    // ---- child collections (inverse side of the ON DELETE CASCADE FKs) ----

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductCharacteristic> characteristics = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductRule> rules = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductPricing> pricings = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductCharge> charges = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductNotification> notifications = new ArrayList<>();

    public Product() {
    }

    // ---- helper methods keep both sides of each relationship in sync ----

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

    public void addCharge(ProductCharge charge) {
        charges.add(charge);
        charge.setProduct(this);
    }

    public void removeCharge(ProductCharge charge) {
        charges.remove(charge);
        charge.setProduct(null);
    }

    public void addNotification(ProductNotification notification) {
        notifications.add(notification);
        notification.setProduct(this);
    }

    public void removeNotification(ProductNotification notification) {
        notifications.remove(notification);
        notification.setProduct(null);
    }

    /** Convenience for the service layer: is the product sellable today? */
    public boolean isActiveOn(LocalDate date) {
        return status == RecordStatus.ACTIVE
                && !date.isBefore(effectiveFrom)
                && (effectiveTo == null || !date.isAfter(effectiveTo));
    }

    // ---- getters / setters ----

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
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

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public RecordStatus getStatus() {
        return status;
    }

    public void setStatus(RecordStatus status) {
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

    public List<ProductCharge> getCharges() {
        return charges;
    }

    public List<ProductNotification> getNotifications() {
        return notifications;
    }

    @Override
    public String toString() {
        return "Product{productId=" + productId + ", productCode='" + productCode
                + "', productName='" + productName + "', status=" + status
                + ", effectiveFrom=" + effectiveFrom + ", effectiveTo=" + effectiveTo + "}";
    }
}
