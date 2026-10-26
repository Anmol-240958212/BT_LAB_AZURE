package com.BankingTech.demo.config;

import java.util.Map;
import org.apache.kafka.common.serialization.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.kafka.core.*;
import org.springframework.kafka.config.*;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class ProductCatalogueKafkaConfig {
    private final KafkaClientProperties kafkaClientProperties;
    private final String replyGroupSuffix;

    public ProductCatalogueKafkaConfig(KafkaClientProperties kafkaClientProperties,
            @Value("${app.kafka.reply-group-suffix:${random.uuid}}") String replyGroupSuffix) {
        this.kafkaClientProperties = kafkaClientProperties;
        this.replyGroupSuffix = replyGroupSuffix;
    }

    @Bean
    KafkaTemplate<String, String> fdProductKafkaTemplate() {
        var properties = kafkaClientProperties.baseProperties();
        properties.putAll(Map.of("acks", "all", "enable.idempotence", true,
            "max.block.ms", 5000, "delivery.timeout.ms", 120000, "max.request.size", 1_000_000));
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(properties,
            new StringSerializer(), new StringSerializer()));
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdCatalogueFactory() {
        return factory("fd-product-catalogue-v1", "earliest");
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdAuthRepliesFactory() {
        return factory("fd-auth-replies-" + replyGroupSuffix, "latest");
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdCustomerReportRepliesFactory() {
        return factory("fd-customer-report-replies-" + replyGroupSuffix, "latest");
    }
    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> fdQuoteRepliesFactory() {
        // Every FD instance receives replies and only completes its own correlation IDs.
        return factory("fd-product-replies-" + replyGroupSuffix, "latest");
    }
    private ConcurrentKafkaListenerContainerFactory<String, String> factory(String group, String reset) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, String>();
        var properties = kafkaClientProperties.baseProperties();
        properties.putAll(Map.of("group.id", group, "auto.offset.reset", reset, "enable.auto.commit", false));
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(properties,
            new StringDeserializer(), new StringDeserializer()));
        factory.setCommonErrorHandler(new DefaultErrorHandler(new FixedBackOff(1000, Long.MAX_VALUE)));
        return factory;
    }
}
