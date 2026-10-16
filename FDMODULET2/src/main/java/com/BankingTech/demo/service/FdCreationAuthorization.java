package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/** Uses the auth service to validate the token and resolve the current account. */
@Service
public class FdCreationAuthorization {
    private final RestClient authClient;

    public FdCreationAuthorization(@Value("${banking.auth.base-url:http://localhost:8080}") String baseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        authClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public void authorize(String authorization, FixedDepositAccountRequestDTO request) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.substring(7).isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to create a fixed deposit");
        }
        Profile profile;
        try {
            profile = authClient.get().uri("/users/me")
                    .header(HttpHeaders.AUTHORIZATION, authorization).retrieve().body(Profile.class);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 401 || ex.getStatusCode().value() == 403) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your session is invalid or expired");
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to verify your account");
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Auth service is unavailable; please try again");
        }
        if (profile == null || profile.role() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account role is unavailable");
        }
        if ("ADMIN".equals(profile.role()) || "BANK_OFFICER".equals(profile.role())) return;
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
    }

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(String role, Long customerId, String customerStatus) {}
}
