package com.bankingtech.product.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.kafka.config.*;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;
import org.apache.kafka.common.serialization.*;

@Configuration
@EnableScheduling
public class ProductKafkaConfig {
    private final KafkaClientProperties kafkaClientProperties;

    public ProductKafkaConfig(KafkaClientProperties kafkaClientProperties) {
        this.kafkaClientProperties = kafkaClientProperties;
    }

    @Bean
    @ConditionalOnProperty(name = "app.kafka.create-topics", havingValue = "true", matchIfMissing = true)
    KafkaAdmin.NewTopics productTopics() {
        return new KafkaAdmin.NewTopics(
            TopicBuilder.name("product-catalogue-v1").partitions(1).replicas(1).compact().build(),
            TopicBuilder.name("product-quote-requests-v1").partitions(1).replicas(1).build(),
            TopicBuilder.name("product-quote-replies-v1").partitions(1).replicas(1).build());
    }
    @Bean
    KafkaTemplate<String, String> productKafkaTemplate() {
        var properties = kafkaClientProperties.baseProperties();
        properties.putAll(Map.of("acks", "all", "enable.idempotence", true,
            "max.block.ms", 5000, "delivery.timeout.ms", 120000,
            "max.request.size", 1_000_000));
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(properties,
            new StringSerializer(), new StringSerializer()));
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> productRequestsFactory() {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
        var properties = kafkaClientProperties.baseProperties();
        properties.putAll(Map.of("group.id", "product-quote-service-v1", "auto.offset.reset", "latest",
                "enable.auto.commit", false));
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(properties,
                new StringDeserializer(), new StringDeserializer()));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(1000, Long.MAX_VALUE)));
        return factory;
    }
}
