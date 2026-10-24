
package com.bankingtech.product;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Date;
import java.util.List;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.bankingtech.product.config.SecurityConfig;
import com.bankingtech.product.controller.ProductController;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.security.ApiSecurityErrorHandler;
import com.bankingtech.product.security.JwtAuthenticationFilter;
import com.bankingtech.product.service.CategoryPricingService;
import com.bankingtech.product.service.ProductService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@WebMvcTest(
    value = ProductController.class,
    properties = "product.jwt.secret=test-signing-secret-at-least-32-bytes-long"
)
@Import({
    SecurityConfig.class,
    JwtAuthenticationFilter.class,
    ApiSecurityErrorHandler.class
})
class ProductSecurityIntegrationTest {

    private static final String SECRET =
            "test-signing-secret-at-least-32-bytes-long";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private CategoryPricingService categoryPricingService;

    @Test
    void missingAndInvalidTokensAreUnauthorized() throws Exception {
        mockMvc.perform(get("/api/product/FD001"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(
                get("/api/product/FD001")
                        .header("Authorization", "Bearer not-a-jwt")
        ).andExpect(status().isUnauthorized());

        mockMvc.perform(
                get("/api/product/FD001")
                        .header("Authorization", bearer("CUSTOMER",
                                "different-test-secret-at-least-32-bytes", Instant.now().plusSeconds(300)))
        ).andExpect(status().isUnauthorized());

        mockMvc.perform(
                get("/api/product/FD001")
                        .header("Authorization", bearer("CUSTOMER", SECRET, Instant.now().minusSeconds(30)))
        ).andExpect(status().isUnauthorized());
    }

    @Test
    void customerCanReadProduct() throws Exception {
        when(productService.get("FD001")).thenReturn(product());

        mockMvc.perform(
                get("/api/product/FD001")
                        .header("Authorization", bearer("CUSTOMER"))
        ).andExpect(status().isOk());
    }

    @Test
    void customerCannotMutateProduct() throws Exception {
        mockMvc.perform(
                put("/api/product/FD001")
                        .header("Authorization", bearer("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productName\":\"Updated\"}")
        ).andExpect(status().isForbidden());

        mockMvc.perform(
                post("/api/product")
                        .header("Authorization", bearer("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody())
        ).andExpect(status().isForbidden());
    }

    @Test
    void officerAndAdminCanWriteProducts() throws Exception {
        when(productService.update(eq("FD001"), any(), any()))
                .thenReturn(product());
        when(productService.create(any(), any())).thenReturn(product());

        String body = "{\"productName\":\"Updated\"}";

        mockMvc.perform(
                put("/api/product/FD001")
                        .header("Authorization", bearer("BANK_OFFICER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
        ).andExpect(status().isOk());

        mockMvc.perform(
                post("/api/product")
                        .header("Authorization", bearer("BANK_OFFICER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody())
        ).andExpect(status().isCreated());

        mockMvc.perform(
                post("/api/product")
                        .header("Authorization", bearer("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductBody())
        ).andExpect(status().isCreated());

        mockMvc.perform(
                put("/api/product/FD001")
                        .header("Authorization", bearer("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
        ).andExpect(status().isOk());

        verify(productService, org.mockito.Mockito.times(2))
                .update(eq("FD001"), any(), any());
    }

    @Test
    void officerTokenPreservesAuthenticatedActorThroughSecurityFilterChain() throws Exception {
        when(productService.update(eq("FD001"), any(), eq("integration-user")))
                .thenReturn(product());
        String token = bearer("BANK_OFFICER");

        mockMvc.perform(
                put("/api/product/FD001")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productName\":\"Updated\"}")
        ).andExpect(status().isOk());

        verify(productService).update(eq("FD001"), any(), eq("integration-user"));
    }

    private String bearer(String role) {
        return bearer(role, SECRET, Instant.now().plusSeconds(300));
    }

    private String createProductBody() {
        return """
                {
                  "productCode":"FD001",
                  "productName":"Fixed Deposit",
                  "productType":"FD",
                  "currency":"INR",
                  "effectiveDate":"2026-01-01",
                  "termLimit":{"min":3,"max":36},
                  "rateLimit":{"min":5.0,"max":15.0},
                  "baseRate":7.0
                }
                """;
    }

    private String bearer(String role, String signingSecret, Instant expiration) {
        Instant now = Instant.now();
        SecretKey key = Keys.hmacShaKeyFor(
                signingSecret.getBytes(StandardCharsets.UTF_8)
        );

        return "Bearer " + Jwts.builder()
                .subject("integration-user")
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(key)
                .compact();
    }

    private ProductResponseDto product() {
        return new ProductResponseDto(
                "FD001",
                "Fixed Deposit",
                "FD",
                "Fixed Deposit",
                "INR",
                null,
                LocalDate.of(2026, 1, 1),
                null,
                RecordStatus.ACTIVE,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                List.of(),
                List.of()
        );
    }
}
