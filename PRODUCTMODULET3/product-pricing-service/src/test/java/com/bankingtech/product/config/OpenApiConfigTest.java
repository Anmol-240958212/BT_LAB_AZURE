package com.bankingtech.product.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import io.swagger.v3.oas.models.security.SecurityScheme;

class OpenApiConfigTest {
    @Test
    void exposesHttpBearerJwtSecurityScheme() {
        var openApi = new OpenApiConfig().productPricingOpenApi();
        SecurityScheme scheme = openApi.getComponents().getSecuritySchemes().get("bearerAuth");

        assertEquals(SecurityScheme.Type.HTTP, scheme.getType());
        assertEquals("bearer", scheme.getScheme());
        assertEquals("JWT", scheme.getBearerFormat());
        assertTrue(openApi.getSecurity().stream().anyMatch(requirement -> requirement.containsKey("bearerAuth")));
    }
}
