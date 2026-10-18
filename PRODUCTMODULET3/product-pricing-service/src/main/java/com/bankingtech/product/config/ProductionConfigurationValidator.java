package com.bankingtech.product.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** Fails startup when a deployed prod profile is configured with sample credentials. */
@Configuration
@Profile("prod")
public class ProductionConfigurationValidator {
    @Bean
    ApplicationRunner validateProductionCredentials(
            @Value("${product.jwt.secret}") String jwtSecret,
            @Value("${spring.datasource.username}") String databaseUsername,
            @Value("${spring.datasource.password}") String databasePassword) {
        return args -> {
            requireProductionSecret("AUTH_JWT_SECRET", jwtSecret);
            requireProductionSecret("DB_USERNAME", databaseUsername);
            requireProductionSecret("DB_PASSWORD", databasePassword);
        };
    }

    static void requireProductionSecret(String name, String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        if (normalized.isBlank() || normalized.contains("${") || normalized.contains("replace-with")
                || normalized.equals("root") || normalized.equals("password")
                || normalized.equals("changeme")
                || normalized.equals("my-super-secret-key-for-authentication-123456789")
                || normalized.equals("local-development-only-change-me-32-bytes-minimum")) {
            throw new IllegalStateException(name + " must be set to a non-placeholder production value");
        }
    }
}
