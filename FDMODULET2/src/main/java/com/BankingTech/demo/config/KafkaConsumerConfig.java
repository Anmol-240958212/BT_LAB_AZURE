
package com.BankingTech.demo.config;

import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import com.BankingTech.demo.dto.KycCustomerEventDto;

@Configuration
public class KafkaConsumerConfig {

    private final KafkaClientProperties kafkaClientProperties;

    public KafkaConsumerConfig(KafkaClientProperties kafkaClientProperties) {
        this.kafkaClientProperties = kafkaClientProperties;
    }

    @Bean
    public ConsumerFactory<String, KycCustomerEventDto> consumerFactory() {
        Map<String, Object> props = kafkaClientProperties.baseProperties();
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "fd-service-group");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        props.put(
                ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                StringDeserializer.class);

        props.put(
                ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
                ErrorHandlingDeserializer.class);

        props.put(
                ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS,
                JsonDeserializer.class);

        props.put(
                JsonDeserializer.VALUE_DEFAULT_TYPE,
                KycCustomerEventDto.class.getName());

        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.BankingTech.demo");

        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, KycCustomerEventDto> kafkaListenerContainerFactory() {

        ConcurrentKafkaListenerContainerFactory<String, KycCustomerEventDto> factory = new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory());

        return factory;
    }
}
