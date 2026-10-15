package com.BankingTech.demo.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {
    @Bean
    public OpenAPI fixedDepositOpenApi() {
        return new OpenAPI().info(new Info().title("Banking Fixed Deposit API").version("1.0")
                .description("FD accounts validate customers against the Kafka-fed registry. "
                        + "Maturity closes accounts and queues emails through Kafka. "
                        + "Use the definition selector to test Auth & Customer APIs too."));
    }
}
