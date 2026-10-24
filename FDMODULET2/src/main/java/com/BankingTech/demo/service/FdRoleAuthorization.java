package com.BankingTech.demo.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;

/** Centralizes role checks for FD APIs after Auth validates the JWT over Kafka. */
@Service
public class FdRoleAuthorization {
    private static final Set<String> STAFF_OPERATIONS = Set.of("STAFF", "BANK_OFFICER", "ADMIN");
    private final FdAuthKafkaClient authClient;

    public FdRoleAuthorization(FdAuthKafkaClient authClient) {
        this.authClient = authClient;
    }

    public FdCreationAuthorization.Profile requireStaffOperation(String authorization) {
        return requireRole(authorization, STAFF_OPERATIONS, "Staff access is required");
    }

    public FdCreationAuthorization.Profile requireAdmin(String authorization) {
        return requireRole(authorization, Set.of("ADMIN"), "Only administrators may perform this operation");
    }

    public FdCreationAuthorization.Profile requireAuthenticatedRole(String authorization) {
        return requireRole(authorization, Set.of("CUSTOMER", "STAFF", "BANK_OFFICER", "ADMIN"),
                "A valid authenticated role is required");
    }

    public void authorizeCustomerOrStaffAccountRead(String authorization, String customerId) {
        var profile = requireAuthenticatedRole(authorization);
        String role = normalize(profile.role());
        if (STAFF_OPERATIONS.contains(role)) return;
        if (!"CUSTOMER".equals(role) || profile.customerId() == null
                || !String.valueOf(profile.customerId()).equals(customerId)) {
            throw forbidden("You can only access your own fixed deposits");
        }
    }

    public void authorizeCustomerOrStaffCustomer(String authorization, String customerId) {
        var profile = requireAuthenticatedRole(authorization);
        String role = normalize(profile.role());
        if (STAFF_OPERATIONS.contains(role)) return;
        if (!"CUSTOMER".equals(role) || profile.customerId() == null
                || !String.valueOf(profile.customerId()).equals(customerId)) {
            throw forbidden("You can only access your own customer data");
        }
    }

    private FdCreationAuthorization.Profile requireRole(String authorization, Set<String> roles, String message) {
        if (authorization == null || !authorization.startsWith("Bearer ")
                || authorization.substring(7).isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        var profile = authClient.profile(authorization);
        if (profile == null || !roles.contains(normalize(profile.role()))) {
            throw forbidden(message);
        }
        return profile;
    }

    private String normalize(String role) {
        return role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    }

    private ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }
}
