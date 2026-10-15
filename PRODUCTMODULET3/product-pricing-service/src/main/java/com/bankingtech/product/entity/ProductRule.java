package com.bankingtech.product.entity;

import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
 * Table {@code product_rule} - business rules that do not fit a single
 * key/value characteristic. Group 8's category-based pricing lives here:
 * <pre>
 *   rule_type       = CATEGORY_PRICING
 *   rule_definition = {"category":"SENIOR_CITIZEN","adjustmentPercent":0.50}
 * </pre>
 * {@code rule_type} is deliberately a String, not an enum: later labs add new
 * rule kinds (EARLY_WITHDRAWAL, ELIGIBILITY, ...) without a schema change.
 * The well-known values are exposed as constants.
 * <p>
 * {@code rule_definition} is a MySQL JSON column - the database rejects
 * malformed JSON, the service layer validates the meaning.
 * <p>
 * UNIQUE (product_id, rule_code): a rule code is unique within its product.
 */
@Entity
@Table(name = "product_rule",
       uniqueConstraints = @UniqueConstraint(name = "uq_rule_product_code",
                                             columnNames = {"product_id", "rule_code"}),
       indexes = {
           @Index(name = "idx_rule_product_type", columnList = "product_id, rule_type"),
           @Index(name = "idx_rule_type",         columnList = "rule_type")
       })
public class ProductRule extends AuditableEntity {

    public static final String TYPE_CATEGORY_PRICING = "CATEGORY_PRICING";
    public static final String TYPE_EARLY_WITHDRAWAL = "EARLY_WITHDRAWAL";
    public static final String TYPE_ELIGIBILITY      = "ELIGIBILITY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rule_id")
    private Long ruleId;

    /** FK product_id -> product (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_rule_product"))
    private Product product;

    /** e.g. CAT_SENIOR_CITIZEN - unique within the product. */
    @Column(name = "rule_code", nullable = false, length = 30)
    private String ruleCode;

    @Column(name = "rule_name", nullable = false, length = 100)
    private String ruleName;

    @Column(name = "rule_type", nullable = false, length = 50)
    private String ruleType;

    /** JSON document; {@code columnDefinition} makes Hibernate validate it against the JSON column. */
    @Column(name = "rule_definition", columnDefinition = "JSON")
    private String ruleDefinition;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 30)
    private RecordStatus status = RecordStatus.ACTIVE;

    public ProductRule() {
    }

    public ProductRule(String ruleCode, String ruleName, String ruleType, String ruleDefinition,
                       LocalDate effectiveFrom) {
        this.ruleCode = ruleCode;
        this.ruleName = ruleName;
        this.ruleType = ruleType;
        this.ruleDefinition = ruleDefinition;
        this.effectiveFrom = effectiveFrom;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public void setRuleId(Long ruleId) {
        this.ruleId = ruleId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getRuleCode() {
        return ruleCode;
    }

    public void setRuleCode(String ruleCode) {
        this.ruleCode = ruleCode;
    }

    public String getRuleName() {
        return ruleName;
    }

    public void setRuleName(String ruleName) {
        this.ruleName = ruleName;
    }

    public String getRuleType() {
        return ruleType;
    }

    public void setRuleType(String ruleType) {
        this.ruleType = ruleType;
    }

    public String getRuleDefinition() {
        return ruleDefinition;
    }

    public void setRuleDefinition(String ruleDefinition) {
        this.ruleDefinition = ruleDefinition;
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
        return "ProductRule{ruleId=" + ruleId + ", ruleCode='" + ruleCode + "', ruleType='" + ruleType
                + "', ruleDefinition='" + ruleDefinition + "', status=" + status + "}";
    }
}
