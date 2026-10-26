package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Uses Kafka to ask Auth to validate the token and resolve the current account. */
@Service
public class FdCreationAuthorization {
    private final FdAuthKafkaClient authClient;

    public FdCreationAuthorization(FdAuthKafkaClient authClient) { this.authClient = authClient; }

    public Profile authorize(String authorization, FixedDepositAccountRequestDTO request) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.substring(7).isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to create a fixed deposit");
        }
        Profile profile = authClient.profile(authorization);
        if (profile == null || profile.role() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account role is unavailable");
        }
        if ("ADMIN".equals(profile.role()) || "BANK_OFFICER".equals(profile.role())
                || "STAFF".equals(profile.role())) {
            Profile targetCustomer = authClient.profile(authorization, request.getCustomerId());
            if (targetCustomer == null || targetCustomer.customerId() == null
                    || !request.getCustomerId().equals(targetCustomer.customerId().toString())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Target customer profile is unavailable");
            }
            if (!"ACTIVE".equals(targetCustomer.customerStatus())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Target customer must complete KYC before creating a fixed deposit");
            }
            return targetCustomer;
        }
        if (!"CUSTOMER".equals(profile.role()) || profile.customerId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A customer profile is required");
        }
        String customerId = profile.customerId().toString();
        if (!customerId.equals(request.getCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only create deposits for your own profile");
        }
        if (!"ACTIVE".equals(profile.customerStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complete KYC before creating a fixed deposit");
        }
        request.setCustomerId(customerId);
        return profile;
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(String role, Long customerId, String customerStatus, Integer customerAge,
            String customerGender, java.util.List<String> pricingCategories) {}
}
