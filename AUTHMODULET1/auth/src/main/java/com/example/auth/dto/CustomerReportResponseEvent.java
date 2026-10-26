package com.example.auth.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * On-demand customer snapshot returned by Auth for FD report generation.
 * This is a transport contract only; Auth remains the source of truth.
 */
public record CustomerReportResponseEvent(
        int schemaVersion,
        String correlationId,
        boolean valid,
        int status,
        String message,
        Customer customer) {

    public record Customer(
            Long customerId,
            String fullName,
            LocalDate dateOfBirth,
            String gender,
            String customerTypeCode,
            String customerTypeName,
            String classificationType,
            String classificationValue,
            String customerStatus,
            String kycStatus,
            String preferredLanguage,
            String countryOfOrigin,
            String email,
            String phoneNumber,
            List<Contact> contacts,
            List<Address> addresses,
            List<Identification> identifications) {
    }

    public record Contact(
            String type,
            String value) {
    }

    public record Address(
            String type,
            String value) {
    }

    /** Identification values should be masked before Auth publishes them. */
    public record Identification(
            String type,
            String maskedValue) {
    }
}
