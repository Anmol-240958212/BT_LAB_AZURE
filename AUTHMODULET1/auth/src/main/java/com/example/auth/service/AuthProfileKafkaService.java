package com.example.auth.service;

import com.example.auth.security.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import tools.jackson.databind.json.JsonMapper;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class AuthProfileKafkaService {
    private final JwtService jwt;
    private final AuthService auth;
    private final KafkaTemplate<String, String> kafka;
    private final JsonMapper json = new JsonMapper();
    public AuthProfileKafkaService(JwtService jwt, AuthService auth,
            @Qualifier("authProfileKafkaTemplate") KafkaTemplate<String, String> kafka) {
        this.jwt = jwt; this.auth = auth; this.kafka = kafka;
    }
    @KafkaListener(topics = "auth-profile-requests-v1", containerFactory = "authProfileRequestsFactory")
    public void profile(String message) throws Exception {
        var request = json.readTree(message);
        String id = request.path("correlationId").asText();
        if (id.isBlank() || request.path("schemaVersion").asInt() != 1
                || request.path("expiresAt").asLong() < System.currentTimeMillis()) return;
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("schemaVersion", 1); response.put("correlationId", id);
        response.put("valid", false); response.put("status", 401);
        String username = null;
        try {
            String header = request.path("authorization").asText();
            if (header.startsWith("Bearer ")) {
                String token = header.substring(7);
                String subject = jwt.extractUsername(token);
                if (jwt.isTokenValid(token, subject)) username = subject;
            }
        } catch (Exception invalidToken) { /* Return 401 without logging credentials. */ }
        if (username != null) {
            try {
                var user = auth.getUserProfile(username);
                Map<String, Object> profile = new LinkedHashMap<>();
                profile.put("role", user.getRole()); profile.put("customerId", user.getCustomerId());
                profile.put("customerStatus", user.getCustomerStatus());
                response.put("profile", profile); response.put("valid", true); response.put("status", 200);
            } catch (Exception unavailable) { response.put("status", 503); }
        }
        kafka.send("auth-profile-replies-v1", id, json.writeValueAsString(response)).get(12, TimeUnit.SECONDS);
    }
}
