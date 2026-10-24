package com.example.auth.service;

import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.example.auth.dto.KycCustomerEventDto;

/**
 * Publishes KYC events to the {@code customer-kyc-events} Kafka topic
 * and synchronizes approved customer status to the FD customer registry.
 */
@Service
public class KycEventPublisherService {

    private static final Logger log = LoggerFactory.getLogger(KycEventPublisherService.class);
    private static final String TOPIC = "customer-kyc-events";

    private final KafkaTemplate<String, KycCustomerEventDto> kafkaTemplate;
    private final JdbcTemplate jdbcTemplate;

    public KycEventPublisherService(
            KafkaTemplate<String, KycCustomerEventDto> kafkaTemplate,
            JdbcTemplate jdbcTemplate) {
        this.kafkaTemplate = kafkaTemplate;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Publishes a single KYC event asynchronously without blocking caller thread,
     * and performs immediate direct registry sync fallback for seamless FD creation.
     */
    public void publishKycEvent(KycCustomerEventDto event) {
        // Immediate sync fallback so FD module recognizes the approved customer even if Kafka is down
        syncToFdCustomerRegistry(event);

        // Send to Kafka in a separate thread with graceful error handling
        CompletableFuture.runAsync(() -> {
            try {
                kafkaTemplate.send(TOPIC, event.getCustomerIdentifier(), event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Could not deliver KYC event to Kafka for customer {}: {}",
                                    event.getCustomerIdentifier(), ex.getMessage());
                        } else {
                            log.info("Successfully delivered KYC event to Kafka for customer {}",
                                    event.getCustomerIdentifier());
                        }
                    });
            } catch (Exception e) {
                log.warn("Kafka broker unreachable for customer {}: {}", event.getCustomerIdentifier(), e.getMessage());
            }
        });
    }

    private void syncToFdCustomerRegistry(KycCustomerEventDto event) {
        try {
            String sql = "INSERT INTO fdmodule.fd_customer_registry " +
                    "(customer_id, full_name, customer_status, kyc_status, email, last_updated_at) " +
                    "VALUES (?, ?, 'ACTIVE', 'ACTIVE', ?, NOW()) " +
                    "ON DUPLICATE KEY UPDATE " +
                    "full_name = VALUES(full_name), " +
                    "customer_status = VALUES(customer_status), " +
                    "kyc_status = VALUES(kyc_status), " +
                    "email = VALUES(email), " +
                    "last_updated_at = VALUES(last_updated_at)";
            jdbcTemplate.update(sql,
                    String.valueOf(event.getCustomerIdentifier()),
                    event.getFullName(),
                    event.getEmail() != null ? event.getEmail() : "");
            log.info("Directly synchronized customer {} ({}) to fd_customer_registry",
                    event.getCustomerIdentifier(), event.getFullName());
        } catch (Exception e) {
            log.warn("Direct sync to fd_customer_registry skipped: {}", e.getMessage());
        }
    }
}