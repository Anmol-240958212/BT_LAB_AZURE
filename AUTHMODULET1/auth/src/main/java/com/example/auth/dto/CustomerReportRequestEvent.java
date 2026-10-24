package com.example.auth.dto;

/**
 * On-demand request sent by FD when it needs customer data for a report.
 * The response is correlated by correlationId and the payload is not stored
 * by the FD module.
 */
public record CustomerReportRequestEvent(
        int schemaVersion,
        String correlationId,
        Long customerId,
        long expiresAt) {
}
