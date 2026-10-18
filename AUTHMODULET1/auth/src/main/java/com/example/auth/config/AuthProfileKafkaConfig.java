package com.example.auth.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.kafka.config.*;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;
import org.apache.kafka.common.serialization.*;

@Configuration
@org.springframework.kafka.annotation.EnableKafka
public class AuthProfileKafkaConfig {
    @Bean
    KafkaAdmin authProfileKafkaAdmin(@Value("${spring.kafka.producer.bootstrap-servers:localhost:9092}") String brokers) {
        var admin = new KafkaAdmin(Map.of("bootstrap.servers", brokers));
        admin.setModifyTopicConfigs(true);
        return admin;
    }
    @Bean
    KafkaAdmin.NewTopics authProfileTopics() {
        return new KafkaAdmin.NewTopics(
            TopicBuilder.name("auth-profile-requests-v1").partitions(1).replicas(1).config("retention.ms", "60000").config("segment.ms", "60000").build(),
            TopicBuilder.name("auth-profile-replies-v1").partitions(1).replicas(1).config("retention.ms", "60000").config("segment.ms", "60000").build());
    }
    @Bean
    KafkaTemplate<String, String> authProfileKafkaTemplate(@Value("${spring.kafka.producer.bootstrap-servers:localhost:9092}") String brokers) {
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(Map.of(
            "bootstrap.servers", brokers, "acks", "all", "enable.idempotence", true,
            "max.block.ms", 5000, "delivery.timeout.ms", 10000, "request.timeout.ms", 5000),
            new StringSerializer(), new StringSerializer()));
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> authProfileRequestsFactory(
            @Value("${spring.kafka.producer.bootstrap-servers:localhost:9092}") String brokers) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(Map.of(
            "bootstrap.servers", brokers, "group.id", "auth-profile-service-v1", "auto.offset.reset", "latest",
            "enable.auto.commit", false), new StringDeserializer(), new StringDeserializer()));
        // Never log request payloads: they contain access tokens.
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(1000, Long.MAX_VALUE)));
        return factory;
    }
}
