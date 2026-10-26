package com.BankingTech.demo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "fd_product_catalogue")
@AttributeOverrides({
        @AttributeOverride(name = "crudValue", column = @Column(name = "fd_product_catalogue_crud_value")),
        @AttributeOverride(name = "userId", column = @Column(name = "fd_product_catalogue_user_id")),
        @AttributeOverride(name = "wsId", column = @Column(name = "fd_product_catalogue_ws_id")),
        @AttributeOverride(name = "hostTs", column = @Column(name = "fd_product_catalogue_host_ts")),
        @AttributeOverride(name = "localTs", column = @Column(name = "fd_product_catalogue_local_ts")),
        @AttributeOverride(name = "ruleSystemId", column = @Column(name = "fd_product_catalogue_rule_system_id")),
        @AttributeOverride(name = "acptTs", column = @Column(name = "fd_product_catalogue_acpt_ts")),
        @AttributeOverride(name = "acptTsUtcOfst", column = @Column(name = "fd_product_catalogue_acpt_ts_utc_ofst")),
        @AttributeOverride(name = "uuid", column = @Column(name = "fd_product_catalogue_uuid"))
})
public class FdProductCatalogue extends AuditEntity {
    @Id @Column(length = 30) private String productCode;
    @Lob @Column(columnDefinition = "LONGTEXT", nullable = false) private String payload;
    private long kafkaOffset;
    public String getProductCode() { return productCode; }
    public void setProductCode(String value) { productCode = value; }
    public String getPayload() { return payload; }
    public void setPayload(String value) { payload = value; }
    public long getKafkaOffset() { return kafkaOffset; }
    public void setKafkaOffset(long value) { kafkaOffset = value; }
}
