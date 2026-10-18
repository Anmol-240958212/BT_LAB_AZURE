package com.BankingTech.demo.config;

import java.util.Map;
import java.util.UUID;
import org.apache.kafka.common.serialization.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.kafka.core.*;
import org.springframework.kafka.config.*;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class ProductCatalogueKafkaConfig {
    @Bean
    KafkaTemplate<String, String> fdProductKafkaTemplate(@Value("${spring.kafka.bootstrap-servers:localhost:9092}") String brokers) {
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(Map.of(
            "bootstrap.servers", brokers, "acks", "all", "enable.idempotence", true,
            "max.block.ms", 5000, "delivery.timeout.ms", 10000, "request.timeout.ms", 5000),
            new StringSerializer(), new StringSerializer()));
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdCatalogueFactory(
            @Value("${spring.kafka.bootstrap-servers:localhost:9092}") String brokers) {
        return factory(brokers, "fd-product-catalogue-v1", "earliest");
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdAuthRepliesFactory(
            @Value("${spring.kafka.bootstrap-servers:localhost:9092}") String brokers) {
        return factory(brokers, "fd-auth-replies-" + UUID.randomUUID(), "latest");
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdQuoteRepliesFactory(
            @Value("${spring.kafka.bootstrap-servers:localhost:9092}") String brokers) {
        // Every FD instance receives replies and only completes its own correlation IDs.
        return factory(brokers, "fd-product-replies-" + UUID.randomUUID(), "latest");
    }
    private ConcurrentKafkaListenerContainerFactory<String, String> factory(String brokers, String group, String reset) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(Map.of(
            "bootstrap.servers", brokers, "group.id", group, "auto.offset.reset", reset,
            "enable.auto.commit", false), new StringDeserializer(), new StringDeserializer()));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(1000, Long.MAX_VALUE)));
        return factory;
    }
}
