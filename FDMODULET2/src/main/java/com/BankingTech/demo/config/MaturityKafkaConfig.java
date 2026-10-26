package com.BankingTech.demo.config;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.util.backoff.FixedBackOff;
import java.util.Map;

@Configuration
public class MaturityKafkaConfig {
    private final KafkaClientProperties kafkaClientProperties;

    public MaturityKafkaConfig(KafkaClientProperties kafkaClientProperties) {
        this.kafkaClientProperties = kafkaClientProperties;
    }

    @Bean
    @ConditionalOnProperty(name = "app.kafka.create-topics", havingValue = "true")
    public KafkaAdmin.NewTopics bankingTopics() {
        return new KafkaAdmin.NewTopics(
                TopicBuilder.name("customer-kyc-events").partitions(1).replicas(1).build(),
                TopicBuilder.name("fd-maturity-events").partitions(1).replicas(1).build(),
                TopicBuilder.name("fd-premature-withdrawal-events").partitions(1).replicas(1).build());
    }

    @Bean
    public ProducerFactory<String, FdMaturityEventDto> maturityProducerFactory() {
        var props = kafkaClientProperties.baseProperties();
        props.putAll(Map.of(
                "acks", "all",
                "enable.idempotence", true,
                "delivery.timeout.ms", 120000,
                "request.timeout.ms", 30000,
                "max.block.ms", 30000));
        return new DefaultKafkaProducerFactory<>(props, new StringSerializer(), new JsonSerializer<>());
    }

    @Bean
    public KafkaTemplate<String, FdMaturityEventDto> maturityKafkaTemplate(
            @org.springframework.beans.factory.annotation.Qualifier("maturityProducerFactory")
            ProducerFactory<String, FdMaturityEventDto> factory) {
        return new KafkaTemplate<>(factory);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, FdMaturityEventDto> maturityKafkaListenerContainerFactory() {
        var props = kafkaClientProperties.baseProperties();
        props.putAll(Map.of(
                "group.id", "fd-maturity-mail-group",
                "auto.offset.reset", "earliest",
                "enable.auto.commit", false));
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class);
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, FdMaturityEventDto.class.getName());
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.BankingTech.demo.dto");
        var factory = new ConcurrentKafkaListenerContainerFactory<String, FdMaturityEventDto>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(props,
                new StringDeserializer(), new ErrorHandlingDeserializer<>(new JsonDeserializer<>(FdMaturityEventDto.class, false))));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(5000, 2)));
        return factory;
    }
}
