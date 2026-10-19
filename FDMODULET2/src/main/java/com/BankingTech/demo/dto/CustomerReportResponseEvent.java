package com.BankingTech.demo.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Customer data returned by Auth for one FD report request.
 * FD must not save this response as a customer projection.
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

    public record Identification(
            String type,
            String maskedValue) {
    }
}
