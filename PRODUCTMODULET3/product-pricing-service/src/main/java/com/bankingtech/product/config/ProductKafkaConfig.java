package com.bankingtech.product.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
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
    @Bean
    KafkaAdmin.NewTopics productTopics() {
        return new KafkaAdmin.NewTopics(
            TopicBuilder.name("product-catalogue-v1").partitions(1).replicas(1).compact().build(),
            TopicBuilder.name("product-quote-requests-v1").partitions(1).replicas(1).build(),
            TopicBuilder.name("product-quote-replies-v1").partitions(1).replicas(1).build());
    }
    @Bean
    KafkaTemplate<String, String> productKafkaTemplate(@Value("${spring.kafka.bootstrap-servers:localhost:9092}") String brokers) {
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(Map.of(
            "bootstrap.servers", brokers, "acks", "all", "enable.idempotence", true,
            "max.block.ms", 5000, "delivery.timeout.ms", 10000, "request.timeout.ms", 5000),
            new StringSerializer(), new StringSerializer()));
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> productRequestsFactory(
            @Value("${spring.kafka.bootstrap-servers:localhost:9092}") String brokers) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(Map.of(
            "bootstrap.servers", brokers, "group.id", "product-quote-service-v1", "auto.offset.reset", "latest",
            "enable.auto.commit", false), new StringDeserializer(), new StringDeserializer()));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(1000, Long.MAX_VALUE)));
        return factory;
    }
}
