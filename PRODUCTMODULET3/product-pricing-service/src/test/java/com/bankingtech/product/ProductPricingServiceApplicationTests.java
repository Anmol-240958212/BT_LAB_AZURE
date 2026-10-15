package com.bankingtech.product;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test: boots the full Spring context against the real MySQL database,
 * which also runs Hibernate schema validation (ddl-auto=validate) for all
 * mapped entities. Needs MySQL running with banking_product_db created; when building
 * a jar without a database use: mvn package -DskipTests
 */
@SpringBootTest
class ProductPricingServiceApplicationTests {

    @Test
    void contextLoads() {
        // Passing means: datasource reachable, all entity mappings match the tables.
    }
}
