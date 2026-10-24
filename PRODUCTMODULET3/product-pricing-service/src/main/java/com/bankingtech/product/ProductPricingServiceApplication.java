package com.bankingtech.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Entry point of the Product & Pricing service (Lab L5 / L9).
 * <p>
 * Start-up order that proves the database work:
 * <ol>
 *   <li>the JDBC driver connects (creating banking_product_db if missing),</li>
 *   <li>Flyway applies the versioned schema, reference-data, and audit migrations,</li>
 *   <li>Hibernate validates every @Entity against the real tables
 *       (spring.jpa.hibernate.ddl-auto=validate) and aborts on any mismatch.</li>
 * </ol>
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ProductPricingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProductPricingServiceApplication.class, args);
    }
}
