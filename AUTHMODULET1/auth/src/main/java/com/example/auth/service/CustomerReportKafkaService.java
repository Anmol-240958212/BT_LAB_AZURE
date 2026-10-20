package com.example.auth.service;

import com.example.auth.dto.CustomerReportRequestEvent;
import com.example.auth.dto.CustomerReportResponseEvent;
import com.example.auth.entity.CustDtl;
import com.example.auth.repository.AuthUsrRepository;
import com.example.auth.repository.CustAddrCmpntRepository;
import com.example.auth.repository.CustCntctDtlsRepository;
import com.example.auth.repository.CustDtlRepository;
import com.example.auth.repository.CustIdfnRepository;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Supplies a short-lived customer snapshot for FD reports. Auth remains the customer source of truth. */
@Service
public class CustomerReportKafkaService {
    private final CustDtlRepository customers;
    private final CustAddrCmpntRepository addresses;
    private final CustCntctDtlsRepository contacts;
    private final CustIdfnRepository identifications;
    private final AuthUsrRepository users;
    private final KafkaTemplate<String, String> kafka;
    private final JsonMapper json = new JsonMapper();

    public CustomerReportKafkaService(CustDtlRepository customers, CustAddrCmpntRepository addresses,
            CustCntctDtlsRepository contacts, CustIdfnRepository identifications, AuthUsrRepository users,
            @Qualifier("authProfileKafkaTemplate") KafkaTemplate<String, String> kafka) {
        this.customers = customers;
        this.addresses = addresses;
        this.contacts = contacts;
        this.identifications = identifications;
        this.users = users;
        this.kafka = kafka;
    }

    @KafkaListener(topics = "auth-customer-report-requests-v1", containerFactory = "authCustomerReportRequestsFactory")
    @Transactional(readOnly = true)
    public void customerSnapshot(String message) throws Exception {
        CustomerReportRequestEvent request;
        try {
            request = json.readValue(message, CustomerReportRequestEvent.class);
        } catch (Exception ignored) {
            return;
        }
        if (request.schemaVersion() != 1 || request.correlationId() == null || request.correlationId().isBlank()
                || request.customerId() == null || request.expiresAt() < System.currentTimeMillis()) return;

        Optional<CustDtl> result = customers.findById(request.customerId());
        CustomerReportResponseEvent response = result
                .map(customer -> customer.getCustomerStatus() == null
                        ? new CustomerReportResponseEvent(1, request.correlationId(), false, 422,
                                "Customer KYC or status is unavailable", null)
                        : new CustomerReportResponseEvent(1, request.correlationId(), true, 200,
                                "Customer details returned", map(customer)))
                .orElseGet(() -> new CustomerReportResponseEvent(1, request.correlationId(), false, 404, "Customer not found", null));
        kafka.send("auth-customer-report-replies-v1", request.correlationId(), json.writeValueAsString(response))
                .get(12, TimeUnit.SECONDS);
    }

    private CustomerReportResponseEvent.Customer map(CustDtl customer) {
        return new CustomerReportResponseEvent.Customer(customer.getCustomerIdentifier(), customer.getFullName(),
                customer.getDateOfBirth(), customer.getGender(),
                customer.getCustomerType() == null ? null : customer.getCustomerType().getTypeCode(),
                customer.getCustomerType() == null ? null : customer.getCustomerType().getTypeName(),
                customer.getClassification() == null ? null : customer.getClassification().getClassificationType(),
                customer.getClassification() == null ? null : customer.getClassification().getClassificationTypeValue(),
                customer.getCustomerStatus() == null ? null : customer.getCustomerStatus().getStatusCode(),
                customer.getCustomerStatus() == null ? null : customer.getCustomerStatus().getStatusCode(),
                customer.getPreferredLanguage(), customer.getCountryOfOrigin(),
                users.findByCustomerCustomerIdentifier(customer.getCustomerIdentifier()).map(user -> user.getEmail()).orElse(null),
                contacts.findByCustomer(customer).stream().map(contact -> new CustomerReportResponseEvent.Contact(
                        contact.getContactType() == null ? null : contact.getContactType().getContactType(), contact.getContactValue())).toList(),
                addresses.findByCustomer(customer).stream().map(address -> new CustomerReportResponseEvent.Address(
                        address.getAddressType() == null ? null : address.getAddressType().getAddressType(), address.getAddressTypeValue())).toList(),
                identifications.findByCustomer(customer).stream().map(id -> new CustomerReportResponseEvent.Identification(
                        id.getIdentificationType() == null ? null : id.getIdentificationType().getIdentificationType(), mask(id.getIdentificationItem()))).toList());
    }

    private String mask(String value) {
        if (value == null || value.isBlank()) return null;
        int visible = Math.min(4, value.length());
        return "X".repeat(Math.max(0, value.length() - visible)) + value.substring(value.length() - visible);
    }
}
