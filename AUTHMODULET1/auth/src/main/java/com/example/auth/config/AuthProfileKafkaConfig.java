package com.example.auth.config;

import java.util.Map;

import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
@org.springframework.kafka.annotation.EnableKafka
public class AuthProfileKafkaConfig {
    private final KafkaClientProperties kafkaClientProperties;

    public AuthProfileKafkaConfig(KafkaClientProperties kafkaClientProperties) {
        this.kafkaClientProperties = kafkaClientProperties;
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.kafka.create-topics", havingValue = "true", matchIfMissing = true)
    KafkaAdmin authProfileKafkaAdmin() {
        var admin = new KafkaAdmin(kafkaClientProperties.baseProperties());
        admin.setModifyTopicConfigs(true);
        return admin;
    }

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.kafka.create-topics", havingValue = "true", matchIfMissing = true)
    KafkaAdmin.NewTopics authProfileTopics() {
        return new KafkaAdmin.NewTopics(
            TopicBuilder.name("auth-profile-requests-v1").partitions(1).replicas(1).config("retention.ms", "60000").config("segment.ms", "60000").build(),
            TopicBuilder.name("auth-profile-replies-v1").partitions(1).replicas(1).config("retention.ms", "60000").config("segment.ms", "60000").build(),
            TopicBuilder.name("auth-customer-report-requests-v1").partitions(1).replicas(1).config("retention.ms", "60000").config("segment.ms", "60000").build(),
            TopicBuilder.name("auth-customer-report-replies-v1").partitions(1).replicas(1).config("retention.ms", "60000").config("segment.ms", "60000").build());
    }

    @Bean
    KafkaTemplate<String, String> authProfileKafkaTemplate() {
        var properties = kafkaClientProperties.baseProperties();
        properties.putAll(Map.of("acks", "all", "enable.idempotence", true,
            "max.block.ms", 5000, "delivery.timeout.ms", 120000, "max.request.size", 1_000_000));
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(properties,
            new StringSerializer(), new StringSerializer()));
    }

    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> authProfileRequestsFactory() {
        return requestFactory("auth-profile-service-v1");
    }

    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> authCustomerReportRequestsFactory() {
        return requestFactory("auth-customer-report-service-v1");
    }

    private ConcurrentKafkaListenerContainerFactory<String, String> requestFactory(String groupId) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
        var properties = kafkaClientProperties.baseProperties();
        properties.putAll(Map.of("group.id", groupId, "auto.offset.reset", "latest", "enable.auto.commit", false));
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(properties,
            new StringDeserializer(), new StringDeserializer()));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(1000, Long.MAX_VALUE)));
        return factory;
    }
}
