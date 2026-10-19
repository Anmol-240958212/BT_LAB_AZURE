package com.BankingTech.demo.service;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;

@Service
public class FdProductPricingService {
    private final KafkaTemplate<String, String> kafka;
    private final JsonMapper json = new JsonMapper();
    private final ConcurrentMap<String, CompletableFuture<Map<String, Object>>> pending = new ConcurrentHashMap<>();
    public FdProductPricingService(@Qualifier("fdProductKafkaTemplate") KafkaTemplate<String, String> kafka) { this.kafka = kafka; }

    @KafkaListener(topics = "product-quote-replies-v1", containerFactory = "fdQuoteRepliesFactory")
    public void receive(String message) {
        var reply = json.readTree(message);
        if (reply.path("schemaVersion").asInt() != 1) return;
        var future = pending.get(reply.path("correlationId").asText());
        if (future != null) future.complete(json.convertValue(reply, Map.class));
    }

    public Map<String, Object> quote(String code, BigDecimal amount, Integer termMonths) {
        if (code == null || code.isBlank() || amount == null || amount.signum() <= 0 || termMonths == null || termMonths <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a product and enter a positive amount and term");
        String correlation = UUID.randomUUID().toString();
        var future = new CompletableFuture<Map<String, Object>>();
        pending.put(correlation, future);
        try {
            // The product catalogue is the source of truth for currency. Do not constrain a
            // quote to INR here: that would make a valid JPY product fail before Product &
            // Pricing can return its authoritative currency.
            var request = Map.of("schemaVersion", 1, "correlationId", correlation, "productCode", code,
                "amount", amount, "termMonths", termMonths);
            kafka.send("product-quote-requests-v1", code, json.writeValueAsString(request))
                .whenComplete((sent, error) -> { if (error != null) future.completeExceptionally(error); });
            return future.get(12, TimeUnit.SECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Pricing request interrupted");
        } catch (Exception error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Product pricing is unavailable. Check Kafka and Product & Pricing, then retry.");
        } finally { pending.remove(correlation); }
    }

    public void applyAuthoritativePricing(FixedDepositAccountRequestDTO request) {
        var quote = quote(request.getProductCode(), request.getPrincipalAmount(), request.getTermMonths());
        if (!Boolean.TRUE.equals(quote.get("valid")) || quote.get("interestRate") == null)
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, String.valueOf(quote.get("message")));
        String currency = String.valueOf(quote.get("currency")).trim().toUpperCase(Locale.ROOT);
        if (!Set.of("INR", "JPY").contains(currency))
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "FD accounts support INR and JPY products. Select a product in one of those currencies.");
        String frequency = String.valueOf(quote.get("interestFrequency"));
        if ("ANNUALLY".equals(frequency)) frequency = "ANNUAL";
        if (!Set.of("MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL").contains(frequency))
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Product compounding frequency is not supported for FD booking");
        request.setInterestRate(new BigDecimal(quote.get("interestRate").toString()));
        request.setInterestType(String.valueOf(quote.get("interestType")));
        request.setInterestFrequency(frequency);
        request.setProductCode(String.valueOf(quote.get("productCode")));
        request.setCurrency(currency);
    }
}
