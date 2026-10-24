package com.bankingtech.product;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Integration Smoke Test: boots the full Spring Boot context against a live MySQL database,
 * running Flyway migrations and Hibernate schema validation (ddl-auto=validate).
 * Enabled when LIVE_DB_TEST=true. For offline / isolated builds, unit tests run by default.
 */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "LIVE_DB_TEST", matches = "true")
class ProductPricingServiceApplicationTests {

    @Test
    void contextLoads() {
        // Passing means: MySQL datasource reachable, Flyway migrations applied,
        // and all JPA entity mappings validate against MySQL tables.
    }
}
