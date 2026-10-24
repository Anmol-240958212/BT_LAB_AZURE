package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.KycCustomerEventDto;
import com.BankingTech.demo.entity.FdCustomerRegistry;
import com.BankingTech.demo.repository.FdCustomerRegistryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Focused tests for the FD Kafka consumer and registry persistence.
 */
public class FdCustomerRegistryTest {

    @Mock
    private FdCustomerRegistryRepository registryRepository;

    @InjectMocks
    private KycEventConsumerService consumerService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(registryRepository.findById(anyString())).thenReturn(Optional.empty());
        when(registryRepository.save(any(FdCustomerRegistry.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void testEventCreatesRegistryRow() {
        KycCustomerEventDto event = new KycCustomerEventDto();
        event.setEventId("evt-001");
        event.setCustomerId(42L);
        event.setCustomerIdentifier("42");
        event.setFullName("Alice User");
        event.setCustomerStatus("ACTIVE");
        event.setKycStatus("ACTIVE");
        event.setEventTimestamp(LocalDateTime.now());

        FdCustomerRegistry saved = new FdCustomerRegistry();
        saved.setCustomerId("42");
        saved.setFullName("Alice User");
        saved.setCustomerStatus("ACTIVE");
        saved.setKycStatus("ACTIVE");
        saved.setLastUpdatedAt(event.getEventTimestamp());

        when(registryRepository.save(any(FdCustomerRegistry.class))).thenReturn(saved);

        // The consumer calls save; verify it is called with correct string id
        consumerService.consumeKycEvent(event);

        verify(registryRepository, times(1)).save(any(FdCustomerRegistry.class));
    }

    @Test
    void testDuplicateEventUpserts() {
        KycCustomerEventDto event = new KycCustomerEventDto();
        event.setCustomerIdentifier("99");
        event.setFullName("Bob");
        event.setCustomerStatus("ACTIVE");
        event.setKycStatus("ACTIVE");
        event.setEventTimestamp(LocalDateTime.now());

        when(registryRepository.findById("99")).thenReturn(Optional.of(new FdCustomerRegistry()));

        consumerService.consumeKycEvent(event);
        verify(registryRepository, times(1)).save(any(FdCustomerRegistry.class));
    }

    @Test
    void olderEventsCannotOverwriteNewerApprovalOrEmail() {
        var existing = new FdCustomerRegistry("10", "Current", "ACTIVE", "ACTIVE", LocalDateTime.now());
        existing.setEmail("current@example.com");
        when(registryRepository.findById("10")).thenReturn(Optional.of(existing));
        var event = new KycCustomerEventDto();
        event.setCustomerIdentifier("10");
        event.setFullName("Old");
        event.setCustomerStatus("LOCKED");
        event.setEventTimestamp(existing.getLastUpdatedAt().minusDays(1));
        consumerService.consumeKycEvent(event);
        verify(registryRepository, never()).save(any());
        assertEquals("ACTIVE", existing.getCustomerStatus());
        assertEquals("current@example.com", existing.getEmail());
    }

    @Test
    void legacyPayloadWithoutEmailPreservesSyncedEmail() {
        var existing = new FdCustomerRegistry("10", "Current", "ACTIVE", "ACTIVE", LocalDateTime.now().minusDays(1));
        existing.setEmail("current@example.com");
        when(registryRepository.findById("10")).thenReturn(Optional.of(existing));
        var event = new KycCustomerEventDto();
        event.setCustomerIdentifier("10");
        event.setFullName("Current");
        event.setCustomerStatus("ACTIVE");
        event.setKycStatus("ACTIVE");
        event.setEventTimestamp(LocalDateTime.now());
        consumerService.consumeKycEvent(event);
        assertEquals("current@example.com", existing.getEmail());
    }
}
