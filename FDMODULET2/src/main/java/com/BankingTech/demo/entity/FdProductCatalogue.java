package com.BankingTech.demo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "fd_product_catalogue")
public class FdProductCatalogue {
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
