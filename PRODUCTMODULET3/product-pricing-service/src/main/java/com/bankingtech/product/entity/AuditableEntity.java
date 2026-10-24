package com.bankingtech.product.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

/**
 * Audit columns present on every one of the 10 tables:
 * <pre>
 *   created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
 *   updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * </pre>
 * {@code @MappedSuperclass} means there is no table for this class - its
 * columns are simply copied into each entity's table.
 * <p>
 * The values are set by JPA lifecycle callbacks so the entity object always
 * carries the timestamps after save(); the MySQL DEFAULT / ON UPDATE clauses
 * remain as a safety net for rows inserted directly through SQL.
 */
@MappedSuperclass
public abstract class AuditableEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
