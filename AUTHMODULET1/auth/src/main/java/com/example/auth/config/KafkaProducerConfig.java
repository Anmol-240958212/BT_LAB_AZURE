package com.example.auth.config;

import com.example.auth.dto.KycCustomerEventDto;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.Map;

@Configuration
public class KafkaProducerConfig {

    private final KafkaClientProperties kafkaClientProperties;

    public KafkaProducerConfig(KafkaClientProperties kafkaClientProperties) {
        this.kafkaClientProperties = kafkaClientProperties;
    }

    @Bean
    public ProducerFactory<String, KycCustomerEventDto> producerFactory() {
        Map<String, Object> props = kafkaClientProperties.baseProperties();
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);
        props.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 1_000_000);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, KycCustomerEventDto> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
