package com.bankingtech.product;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.util.Properties;

import org.junit.jupiter.api.Test;

class SecurityConfigurationTest {
    @Test
    void defaultProfileRequiresDeploymentCredentialsAndSigningKey() throws IOException {
        Properties properties = load("application-prod.properties");

        assertTrue(properties.getProperty("product.jwt.secret").equals("${AUTH_JWT_SECRET}"));
        assertTrue(properties.getProperty("spring.datasource.username").equals("${DB_USERNAME}"));
        assertTrue(properties.getProperty("spring.datasource.password").equals("${DB_PASSWORD}"));
    }

    @Test
    void developmentFallbacksExistOnlyInExplicitLocalProfile() throws IOException {
        Properties local = load("application.properties");

        assertTrue(local.getProperty("product.jwt.secret").startsWith("${AUTH_JWT_SECRET:"));
        assertTrue(local.getProperty("spring.datasource.username").startsWith("${DB_USERNAME:"));
        assertTrue(local.getProperty("spring.datasource.password").startsWith("${DB_PASSWORD:"));
        assertFalse(load("application-prod.properties").getProperty("product.jwt.secret").contains(":"));
    }

    @Test
    void productionRequiresVerifiedTlsWhileLocalProfileOwnsInsecureOptions() throws IOException {
        Properties production = load("application-prod.properties");
        Properties local = load("application.properties");
        String productionUrl = production.getProperty("spring.datasource.url");
        String localUrl = local.getProperty("spring.datasource.url");

        assertTrue(productionUrl.contains("sslMode=VERIFY_IDENTITY"));
        assertFalse(productionUrl.contains("useSSL=false"));
        assertFalse(productionUrl.contains("allowPublicKeyRetrieval=true"));
        assertTrue(localUrl.contains("useSSL=false"));
    }

    private Properties load(String resource) throws IOException {
        Properties properties = new Properties();
        try (var stream = getClass().getClassLoader().getResourceAsStream(resource)) {
            if (stream == null) throw new IOException("Missing classpath resource: " + resource);
            properties.load(stream);
        }
        return properties;
    }
}
