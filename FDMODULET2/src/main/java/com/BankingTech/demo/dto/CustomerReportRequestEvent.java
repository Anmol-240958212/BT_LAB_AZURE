package com.BankingTech.demo.dto;

/**
 * On-demand request sent to Auth when FD needs customer data for a report.
 * The customer payload is used in memory and is not persisted by FD.
 */
public record CustomerReportRequestEvent(
        int schemaVersion,
        String correlationId,
        Long customerId,
        long expiresAt) {
}
