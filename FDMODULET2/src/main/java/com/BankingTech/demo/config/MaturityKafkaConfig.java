package com.BankingTech.demo.config;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.HashMap;

@Configuration
public class MaturityKafkaConfig {
    private final KafkaClientProperties kafkaClientProperties;

    public MaturityKafkaConfig(KafkaClientProperties kafkaClientProperties) {
        this.kafkaClientProperties = kafkaClientProperties;
    }

    @Bean
    @ConditionalOnProperty(name = "app.kafka.create-topics", havingValue = "true", matchIfMissing = true)
    public KafkaAdmin.NewTopics bankingTopics() {
        return new KafkaAdmin.NewTopics(
                TopicBuilder.name("customer-kyc-events").partitions(1).replicas(1).build(),
                TopicBuilder.name("fd-maturity-events").partitions(1).replicas(1).build(),
                TopicBuilder.name("fd-premature-withdrawal-events").partitions(1).replicas(1).build());
    }

    @Bean
    public ProducerFactory<String, FdMaturityEventDto> maturityProducerFactory() {
        var props = kafkaClientProperties.baseProperties();
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);
        props.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 1_000_000);
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 5000);
        return new DefaultKafkaProducerFactory<>(props);
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
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "fd-maturity-mail-group");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class);
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, FdMaturityEventDto.class.getName());
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.BankingTech.demo.dto");
        var factory = new ConcurrentKafkaListenerContainerFactory<String, FdMaturityEventDto>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(props));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(5000, 2)));
        return factory;
    }
}
