package com.bankingtech.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Table {@code product_type_master} - master / lookup list of product
 * categories (FD, RD, SB, CA ...). Seeded by V2__seed_reference_data.sql.
 * <p>
 * Master rows are never cascaded: {@code product.product_type_id} references
 * this table with ON DELETE RESTRICT, so a type cannot be removed while any
 * product still uses it.
 */
@Entity
@Table(name = "product_type_master",
       uniqueConstraints = @UniqueConstraint(name = "uq_product_type_code", columnNames = "type_code"))
public class ProductTypeMaster extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // BIGINT AUTO_INCREMENT
    @Column(name = "product_type_id")
    private Long productTypeId;

    /** Short code used in the API, e.g. "FD". */
    @Column(name = "type_code", nullable = false, length = 30)
    private String typeCode;

    @Column(name = "type_name", nullable = false, length = 100)
    private String typeName;

    @Column(name = "description", length = 255)
    private String description;

    public ProductTypeMaster() {
    }

    public ProductTypeMaster(String typeCode, String typeName, String description) {
        this.typeCode = typeCode;
        this.typeName = typeName;
        this.description = description;
    }

    public Long getProductTypeId() {
        return productTypeId;
    }

    public void setProductTypeId(Long productTypeId) {
        this.productTypeId = productTypeId;
    }

    public String getTypeCode() {
        return typeCode;
    }

    public void setTypeCode(String typeCode) {
        this.typeCode = typeCode;
    }

    public String getTypeName() {
        return typeName;
    }

    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return "ProductTypeMaster{productTypeId=" + productTypeId
                + ", typeCode='" + typeCode + "', typeName='" + typeName + "'}";
    }
}
