package com.bankingtech.product.service;

import org.springframework.stereotype.Service;

import com.bankingtech.product.entity.ProductAuditEvent;
import com.bankingtech.product.repository.ProductAuditRepository;

@Service
public class ProductAuditService {
    private final ProductAuditRepository auditEvents;

    public ProductAuditService(ProductAuditRepository auditEvents) {
        this.auditEvents = auditEvents;
    }

    public void record(String productCode, String action, String actor, String detailsJson) {
        auditEvents.save(new ProductAuditEvent(productCode, action,
                actor == null || actor.isBlank() ? "unknown" : actor, detailsJson));
    }
}
