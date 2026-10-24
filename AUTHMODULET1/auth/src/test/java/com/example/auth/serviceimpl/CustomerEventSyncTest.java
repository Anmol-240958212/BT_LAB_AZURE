package com.example.auth.serviceimpl;

import com.example.auth.entity.*;
import com.example.auth.repository.AuthUsrRepository;
import com.example.auth.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class CustomerEventSyncTest {
    @Test void republishesOriginalCustomerIdAndRegisteredEmail() {
        var users = mock(AuthUsrRepository.class);
        var publisher = mock(KycEventPublisherService.class);
        var user = new AuthUsr();
        var customer = new CustDtl();
        var status = new CustStsMstr();
        status.setStatusCode("ACTIVE");
        customer.setCustomerIdentifier(10L);
        customer.setFullName("Fresh Test");
        customer.setCustomerStatus(status);
        user.setUserId(11L);
        user.setEmail("real@example.com");
        user.setCustomer(customer);
        when(users.findByUsername("real@example.com")).thenReturn(Optional.of(user));
        new CustomerEventSyncService(users, publisher).sync("real@example.com");
        verify(publisher).publishKycEvent(argThat(e -> e.getCustomerId().equals(10L)
                && "10".equals(e.getCustomerIdentifier()) && "real@example.com".equals(e.getEmail())));
    }

    @Test void refusesCustomersWithoutApprovedKyc() {
        var users = mock(AuthUsrRepository.class);
        var publisher = mock(KycEventPublisherService.class);
        when(users.findByUsername("pending")).thenReturn(Optional.of(new AuthUsr()));
        assertThrows(ResponseStatusException.class, () -> new CustomerEventSyncService(users, publisher).sync("pending"));
        verifyNoInteractions(publisher);
    }
}
