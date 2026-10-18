package com.bankingtech.product.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class ProductionConfigurationValidatorTest {
    @Test
    void rejectsKnownDevelopmentAndPlaceholderCredentials() {
        assertThrows(IllegalStateException.class,
                () -> ProductionConfigurationValidator.requireProductionSecret("AUTH_JWT_SECRET",
                        "my-super-secret-key-for-authentication-123456789"));
        assertThrows(IllegalStateException.class,
                () -> ProductionConfigurationValidator.requireProductionSecret("DB_PASSWORD", "root"));
        assertThrows(IllegalStateException.class,
                () -> ProductionConfigurationValidator.requireProductionSecret("DB_PASSWORD", "replace-with-password"));
        assertThrows(IllegalStateException.class,
                () -> ProductionConfigurationValidator.requireProductionSecret("AUTH_JWT_SECRET",
                        "local-development-only-change-me-32-bytes-minimum"));
    }

    @Test
    void acceptsNonPlaceholderSecretWithoutRevealingIt() {
        assertDoesNotThrow(() -> ProductionConfigurationValidator.requireProductionSecret(
                "DB_PASSWORD", "a-long-production-value-which-is-not-a-default"));
    }
}
