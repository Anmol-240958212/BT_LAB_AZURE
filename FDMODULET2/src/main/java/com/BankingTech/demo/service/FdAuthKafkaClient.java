package com.BankingTech.demo.service;

import java.util.*;
import java.util.concurrent.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class FdAuthKafkaClient {
    private final KafkaTemplate<String, String> kafka;
    private final JsonMapper json = new JsonMapper();
    private final ConcurrentMap<String, CompletableFuture<Map<String, Object>>> pending = new ConcurrentHashMap<>();
    public FdAuthKafkaClient(@Qualifier("fdProductKafkaTemplate") KafkaTemplate<String, String> kafka) { this.kafka = kafka; }
    @KafkaListener(topics = "auth-profile-replies-v1", containerFactory = "fdAuthRepliesFactory")
    public void receive(String message) {
        var reply = json.readTree(message);
        if (reply.path("schemaVersion").asInt() != 1) return;
        var future = pending.get(reply.path("correlationId").asText());
        if (future != null) future.complete(json.convertValue(reply, Map.class));
    }
    public FdCreationAuthorization.Profile profile(String authorization) {
        return profile(authorization, null);
    }
    public FdCreationAuthorization.Profile profile(String authorization, String customerId) {
        if (authorization == null || authorization.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        String id = UUID.randomUUID().toString();
        var future = new CompletableFuture<Map<String, Object>>();
        pending.put(id, future);
        Map<String, Object> reply;
        try {
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("schemaVersion", 1); request.put("correlationId", id); request.put("authorization", authorization);
            request.put("expiresAt", System.currentTimeMillis() + 15000);
            if (customerId != null && !customerId.isBlank()) request.put("customerId", customerId);
            kafka.send("auth-profile-requests-v1", id, json.writeValueAsString(request))
                .whenComplete((sent, error) -> { if (error != null) future.completeExceptionally(error); });
            reply = future.get(12, TimeUnit.SECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Account verification interrupted");
        } catch (Exception error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Auth verification is unavailable. Check Auth and Kafka.");
        } finally { pending.remove(id); }
        if (!Boolean.TRUE.equals(reply.get("valid"))) {
            int status = ((Number) reply.getOrDefault("status", 401)).intValue();
            throw new ResponseStatusException(status == 503 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.UNAUTHORIZED,
                status == 503 ? "Unable to verify your account" : "Your session is invalid or expired");
        }
        return json.convertValue(reply.get("profile"), FdCreationAuthorization.Profile.class);
    }
}
