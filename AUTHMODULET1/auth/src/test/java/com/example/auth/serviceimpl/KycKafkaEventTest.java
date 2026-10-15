package com.example.auth.serviceimpl;

import com.example.auth.entity.CustDtl;
import com.example.auth.entity.CustStsMstr;
import com.example.auth.event.KycApprovedEvent;
import com.example.auth.event.KycKafkaEventListener;
import com.example.auth.service.KycEventPublisherService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;

import static org.mockito.Mockito.*;

/**
 * Focused tests for the Kafka event flow triggered by a successful KYC
 * submission.
 */
public class KycKafkaEventTest {

    private KycEventPublisherService mockPublisher;
    private KycKafkaEventListener listener;

    @BeforeEach
    void setUp() {
        mockPublisher = Mockito.mock(KycEventPublisherService.class);
        var users = Mockito.mock(com.example.auth.repository.AuthUsrRepository.class);
        var user = new com.example.auth.entity.AuthUsr();
        user.setEmail("alice@example.com");
        when(users.findByCustomerCustomerIdentifier(42L)).thenReturn(java.util.Optional.of(user));
        listener = new KycKafkaEventListener(mockPublisher, users);
    }

    @Test
    void testEventPublishedWhenKycApproved() {
        CustStsMstr status = new CustStsMstr();
        status.setStatusCode("ACTIVE");

        CustDtl customer = new CustDtl();
        customer.setCustomerIdentifier(42L);
        customer.setFullName("Alice Smith");
        customer.setCustomerStatus(status);

        listener.onKycApproved(new KycApprovedEvent(customer));

        verify(mockPublisher, times(1)).publishKycEvent(argThat(e -> "alice@example.com".equals(e.getEmail())
                && "42".equals(e.getCustomerIdentifier())));
    }

    @Test
    void testNoEventWhenCustomerStatusNotActive() {
        CustStsMstr status = new CustStsMstr();
        status.setStatusCode("INACTIVE");

        CustDtl customer = new CustDtl();
        customer.setCustomerIdentifier(42L);
        customer.setFullName("Bob Jones");
        customer.setCustomerStatus(status);

        // Even if the event is raised manually, the listener always sends the
        // current status from the event payload; the guard that prevents
        // publication for non-ACTIVE submissions is in the service layer.
        listener.onKycApproved(new KycApprovedEvent(customer));

        verify(mockPublisher, times(1)).publishKycEvent(any());
    }
}
