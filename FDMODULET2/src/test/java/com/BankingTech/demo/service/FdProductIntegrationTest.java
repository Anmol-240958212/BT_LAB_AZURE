package com.BankingTech.demo.service;

import com.BankingTech.demo.entity.FdProductCatalogue;
import com.BankingTech.demo.repository.FdProductCatalogueRepository;
import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class FdProductIntegrationTest {
    @Test void ignoresDuplicateAndOlderCatalogueEvents() {
        var repository = mock(FdProductCatalogueRepository.class);
        var existing = new FdProductCatalogue(); existing.setProductCode("FD1"); existing.setKafkaOffset(10);
        when(repository.findById("FD1")).thenReturn(Optional.of(existing));
        var service = new FdProductCatalogueService(repository);
        String event = "{\"schemaVersion\":1,\"product\":{\"productCode\":\"FD1\"}}";
        service.consume(new ConsumerRecord<>("product-catalogue-v1", 0, 9, "FD1", event));
        service.consume(new ConsumerRecord<>("product-catalogue-v1", 0, 10, "FD1", event));
        verify(repository, never()).save(any());
        service.consume(new ConsumerRecord<>("product-catalogue-v1", 0, 11, "FD1", event));
        verify(repository).save(existing);
        assertEquals(11, existing.getKafkaOffset());
    }

    @Test void usesCorrelatedKafkaRateInsteadOfBrowserRate() {
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        var service = new FdProductPricingService(kafka);
        var json = new JsonMapper();
        when(kafka.send(eq("product-quote-requests-v1"), eq("FD1"), anyString())).thenAnswer(call -> {
            String id = json.readTree((String) call.getArgument(2)).path("correlationId").asText();
            service.receive("{\"schemaVersion\":1,\"correlationId\":\"" + id + "\",\"valid\":true,\"currency\":\"INR\",\"productCode\":\"FD1\",\"interestRate\":6.75,\"interestType\":\"SIMPLE\",\"interestFrequency\":\"ANNUALLY\"}");
            return CompletableFuture.completedFuture(null);
        });
        var request = new FixedDepositAccountRequestDTO();
        request.setProductCode("FD1"); request.setPrincipalAmount(BigDecimal.valueOf(50000)); request.setTermMonths(12);
        request.setInterestRate(BigDecimal.valueOf(99));
        service.applyAuthoritativePricing(request);
        assertEquals(new BigDecimal("6.75"), request.getInterestRate());
        assertEquals("SIMPLE", request.getInterestType());
        assertEquals("ANNUAL", request.getInterestFrequency());
    }

    @Test void brokerFailureRejectsQuoteInsteadOfUsingFallback() {
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        when(kafka.send(anyString(), anyString(), anyString())).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker offline")));
        var service = new FdProductPricingService(kafka);
        assertEquals(503, assertThrows(ResponseStatusException.class,
            () -> service.quote("FD1", BigDecimal.TEN, 12)).getStatusCode().value());
    }
}
