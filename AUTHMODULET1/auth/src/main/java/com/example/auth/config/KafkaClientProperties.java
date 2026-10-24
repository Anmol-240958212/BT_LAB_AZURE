package com.example.auth.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.common.config.SaslConfigs;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Builds Kafka client properties shared by local Kafka and Azure Event Hubs. */
@Component
public class KafkaClientProperties {
    private final Environment environment;

    public KafkaClientProperties(Environment environment) {
        this.environment = environment;
    }

    public Map<String, Object> baseProperties() {
        Map<String, Object> properties = new HashMap<>();
        String brokers = environment.getProperty("spring.kafka.bootstrap-servers",
                environment.getProperty("spring.kafka.producer.bootstrap-servers", "localhost:9092"));
        properties.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, brokers);
        copy(properties, CommonClientConfigs.SECURITY_PROTOCOL_CONFIG, "spring.kafka.properties.security.protocol");
        copy(properties, SaslConfigs.SASL_MECHANISM, "spring.kafka.properties.sasl.mechanism");
        copy(properties, SaslConfigs.SASL_JAAS_CONFIG, "spring.kafka.properties.sasl.jaas.config");
        copy(properties, CommonClientConfigs.REQUEST_TIMEOUT_MS_CONFIG, "spring.kafka.properties.request.timeout.ms");
        copy(properties, CommonClientConfigs.METADATA_MAX_AGE_CONFIG, "spring.kafka.properties.metadata.max.age.ms");
        copy(properties, CommonClientConfigs.CONNECTIONS_MAX_IDLE_MS_CONFIG, "spring.kafka.properties.connections.max.idle.ms");
        return properties;
    }

    private void copy(Map<String, Object> target, String kafkaKey, String propertyKey) {
        String value = environment.getProperty(propertyKey);
        if (value != null && !value.isBlank()) {
            target.put(kafkaKey, value);
        }
    }
}
