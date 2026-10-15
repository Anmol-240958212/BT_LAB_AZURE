package com.bankingtech.product.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.ChargeType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Table {@code charge} - master list of charge definitions shared by all
 * products (TDS, premature-withdrawal fee, interest credit ...). Seeded by
 * V2__seed_reference_data.sql.
 * <p>
 * How much a charge costs is NOT stored here - that is per product, in
 * {@link ProductCharge}. Like every master table it is protected by
 * ON DELETE RESTRICT: a charge cannot be deleted while a product uses it.
 */
@Entity
@Table(name = "charge",
       uniqueConstraints = @UniqueConstraint(name = "uq_charge_code", columnNames = "charge_code"))
public class Charge extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "charge_id")
    private Long chargeId;

    /** e.g. TDS, PREMAT_WD_FEE */
    @Column(name = "charge_code", nullable = false, length = 30)
    private String chargeCode;

    @Column(name = "charge_name", nullable = false, length = 100)
    private String chargeName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "charge_type", nullable = false, length = 30)
    private ChargeType chargeType;

    @Column(name = "description", length = 255)
    private String description;

    public Charge() {
    }

    public Charge(String chargeCode, String chargeName, ChargeType chargeType, String description) {
        this.chargeCode = chargeCode;
        this.chargeName = chargeName;
        this.chargeType = chargeType;
        this.description = description;
    }

    public Long getChargeId() {
        return chargeId;
    }

    public void setChargeId(Long chargeId) {
        this.chargeId = chargeId;
    }

    public String getChargeCode() {
        return chargeCode;
    }

    public void setChargeCode(String chargeCode) {
        this.chargeCode = chargeCode;
    }

    public String getChargeName() {
        return chargeName;
    }

    public void setChargeName(String chargeName) {
        this.chargeName = chargeName;
    }

    public ChargeType getChargeType() {
        return chargeType;
    }

    public void setChargeType(ChargeType chargeType) {
        this.chargeType = chargeType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return "Charge{chargeId=" + chargeId + ", chargeCode='" + chargeCode
                + "', chargeName='" + chargeName + "', chargeType=" + chargeType + "}";
    }
}
