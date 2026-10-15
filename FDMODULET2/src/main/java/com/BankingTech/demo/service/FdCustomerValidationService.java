package com.BankingTech.demo.service;

import com.BankingTech.demo.entity.FdCustomerRegistry;
import com.BankingTech.demo.repository.FdCustomerRegistryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FdCustomerValidationService {
    private final FdCustomerRegistryRepository registry;

    public FdCustomerValidationService(FdCustomerRegistryRepository registry) { this.registry = registry; }

    public FdCustomerRegistry requireApprovedCustomer(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer ID is required");
        }
        var customer = registry.findById(customerId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer is not synchronized to FD; complete KYC and wait for Kafka"));
        if (!"ACTIVE".equalsIgnoreCase(customer.getCustomerStatus())
                || !"ACTIVE".equalsIgnoreCase(customer.getKycStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer and KYC must both be ACTIVE to open an FD");
        }
        return customer;
    }
}
