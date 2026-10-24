package com.bankingtech.product;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.util.Properties;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

class SecurityConfigurationTest {
    @Test
    void defaultProfileRequiresDeploymentCredentialsAndSigningKey() throws IOException {
        Properties properties = loadYaml("application-prod.yaml");

        assertTrue(properties.getProperty("product.jwt.secret").equals("${AUTH_JWT_SECRET}"));
        assertTrue(properties.getProperty("spring.datasource.username").equals("${DB_USERNAME}"));
        assertTrue(properties.getProperty("spring.datasource.password").equals("${DB_PASSWORD}"));
    }

    @Test
    void developmentFallbacksExistOnlyInExplicitLocalProfile() throws IOException {
        Properties local = loadYaml("application.yaml");

        assertTrue(local.getProperty("product.jwt.secret").startsWith("${AUTH_JWT_SECRET:"));
        assertTrue(local.getProperty("spring.datasource.username").startsWith("${DB_USERNAME:"));
        assertTrue(local.getProperty("spring.datasource.password").startsWith("${DB_PASSWORD:"));
        assertFalse(loadYaml("application-prod.yaml").getProperty("product.jwt.secret").contains(":"));
    }

    @Test
    void productionRequiresVerifiedTlsWhileLocalProfileOwnsInsecureOptions() throws IOException {
        Properties production = loadYaml("application-prod.yaml");
        Properties local = loadYaml("application.yaml");
        String productionUrl = production.getProperty("spring.datasource.url");
        String localUrl = local.getProperty("spring.datasource.url");

        assertTrue(productionUrl.contains("sslMode=VERIFY_IDENTITY"));
        assertFalse(productionUrl.contains("useSSL=false"));
        assertFalse(productionUrl.contains("allowPublicKeyRetrieval=true"));
        assertTrue(localUrl.contains("useSSL=false"));
    }

    private Properties loadYaml(String resource) throws IOException {
        ClassPathResource yaml = new ClassPathResource(resource);
        if (!yaml.exists()) throw new IOException("Missing classpath resource: " + resource);
        YamlPropertiesFactoryBean factory = new YamlPropertiesFactoryBean();
        factory.setResources(yaml);
        Properties properties = factory.getObject();
        if (properties == null) throw new IOException("Unable to parse classpath resource: " + resource);
        return properties;
    }
}
