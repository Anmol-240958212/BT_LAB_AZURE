package com.example.auth.service;

import com.example.auth.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import java.util.concurrent.CompletableFuture;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.json.JsonMapper;

class AuthProfileKafkaServiceTest {
    @Test void revokedTokenDoesNotExposeProfile() throws Exception {
        var jwt = mock(JwtService.class);
        var auth = mock(AuthService.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        when(jwt.extractUsername("revoked")).thenReturn("customer");
        when(jwt.isTokenValid("revoked", "customer")).thenReturn(false);
        when(kafka.send(anyString(), anyString(), anyString())).thenAnswer(call -> {
            var response = new JsonMapper().readTree((String) call.getArgument(2));
            assertFalse(response.path("valid").asBoolean());
            assertEquals(401, response.path("status").asInt());
            assertFalse(response.has("profile"));
            return CompletableFuture.completedFuture(null);
        });
        new AuthProfileKafkaService(jwt, auth, kafka).profile("{\"schemaVersion\":1,\"correlationId\":\"test\",\"authorization\":\"Bearer revoked\",\"expiresAt\":" + (System.currentTimeMillis()+15000) + "}");
        verifyNoInteractions(auth);
        verify(kafka).send(eq("auth-profile-replies-v1"), eq("test"), anyString());
    }
    @Test void expiredRequestIsIgnored() throws Exception {
        var jwt = mock(JwtService.class); var auth = mock(AuthService.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        new AuthProfileKafkaService(jwt, auth, kafka).profile("{\"schemaVersion\":1,\"correlationId\":\"old\",\"expiresAt\":1}");
        verifyNoInteractions(jwt, auth, kafka);
    }
}
