package com.bankingtech.product.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Durable actor/action trail for product administration (manual Lab L9). */
@Entity
@Table(name = "product_audit")
public class ProductAuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Long auditId;

    @Column(name = "product_code", nullable = false, length = 30)
    private String productCode;

    @Column(name = "action", nullable = false, length = 40)
    private String action;

    @Column(name = "actor", nullable = false, length = 100)
    private String actor;

    @Column(name = "details", columnDefinition = "JSON")
    private String details;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    protected ProductAuditEvent() { }

    public ProductAuditEvent(String productCode, String action, String actor, String details) {
        this.productCode = productCode;
        this.action = action;
        this.actor = actor;
        this.details = details;
    }
}
