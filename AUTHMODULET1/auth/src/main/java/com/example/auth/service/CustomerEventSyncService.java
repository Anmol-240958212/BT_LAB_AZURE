package com.example.auth.service;

import com.example.auth.dto.KycCustomerEventDto;
import com.example.auth.repository.AuthUsrRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CustomerEventSyncService {
    private final AuthUsrRepository users;
    private final KycEventPublisherService publisher;

    public CustomerEventSyncService(AuthUsrRepository users, KycEventPublisherService publisher) {
        this.users = users;
        this.publisher = publisher;
    }

    /** Republish the authenticated customer's snapshot, including registered email. */
    @Transactional(readOnly = true)
    public void sync(String username) {
        var user = users.findByUsername(username).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer login not found"));
        var customer = user.getCustomer();
        if (customer == null || customer.getCustomerStatus() == null
                || !"ACTIVE".equals(customer.getCustomerStatus().getStatusCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Complete KYC before synchronizing the customer");
        }
        var event = new KycCustomerEventDto(UUID.randomUUID().toString(), customer.getCustomerIdentifier(),
                customer.getCustomerIdentifier().toString(), customer.getFullName(), "ACTIVE", "ACTIVE", LocalDateTime.now());
        event.setEmail(user.getEmail());
        publisher.publishKycEvent(event);
    }
}
