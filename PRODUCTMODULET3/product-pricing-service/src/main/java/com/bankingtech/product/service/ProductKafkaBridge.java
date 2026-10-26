package com.bankingtech.product.service;

import com.bankingtech.product.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.slf4j.LoggerFactory;

/** Reconciles committed catalogue state over Kafka, including products created before integration. */
@Service
public class ProductKafkaBridge {
    private final ProductService products;
    private final ProductRepository repository;
    private final ObjectMapper json;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate transaction;
    private final CategoryPricingService categoryPricing;

    public ProductKafkaBridge(ProductService products, ProductRepository repository, ObjectMapper json,
            KafkaTemplate<String, String> kafka, PlatformTransactionManager manager,
            CategoryPricingService categoryPricing) {
        this.products = products; this.repository = repository; this.json = json; this.kafka = kafka;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setReadOnly(true);
        this.categoryPricing = categoryPricing;
    }

    @Scheduled(fixedDelayString = "${product.catalogue.sync-ms:5000}", initialDelay = 3000)
    public void synchronizeCatalogue() {
        try {
            var snapshots = transaction.execute(status -> repository.findAll().stream()
                .map(product -> products.get(product.getProductCode())).toList());
            for (var product : snapshots) {
                kafka.send("product-catalogue-v1", product.productCode(), json.writeValueAsString(
                    Map.of("schemaVersion", 1, "product", product))).get(12, TimeUnit.SECONDS);
            }
        } catch (Exception error) {
            // The source database retains every product. The next pass retries the latest state.
            LoggerFactory.getLogger(getClass()).warn("Catalogue synchronization will retry: {}", error.getMessage());
        }
    }

    @KafkaListener(topics = "product-quote-requests-v1", containerFactory = "productRequestsFactory")
    public void quote(String message) throws Exception {
        var request = json.readTree(message);
        String correlation = request.path("correlationId").asText();
        if (correlation.isBlank() || request.path("schemaVersion").asInt() != 1) return;
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("correlationId", correlation);
        response.put("schemaVersion", 1);
        try {
            var product = products.get(request.path("productCode").asText());
            var result = products.validateProductForAccount(request.path("productCode").asText(),
                request.path("termMonths").asInt(), request.path("amount").decimalValue(),
                product.currency());
            boolean valid = result.valid() && "FD".equals(product.productType());
            var categories = new ArrayList<String>();
            request.path("categories").forEach(value -> categories.add(value.asText()));
            var effectiveRate = categoryPricing.effectiveRate(request.path("productCode").asText(), categories,
                    request.hasNonNull("customerAge") ? request.path("customerAge").asInt() : null,
                    request.path("customerGender").asText(null), java.time.LocalDate.now(),
                    request.path("amount").decimalValue(), request.path("termMonths").asInt(),
                    com.bankingtech.product.entity.enums.DurationUnit.MONTHS);
            response.put("valid", valid);
            response.put("message", valid ? result.message() : (result.valid() ? "Only fixed-deposit products can be booked" : result.message()));
            response.put("productCode", result.productCode());
            response.put("interestRate", effectiveRate.effectiveRate());
            response.put("appliedPricingCategories", effectiveRate.appliedCategories());
            response.put("interestType", result.rateType());
            response.put("interestFrequency", result.frequency());
            response.put("termLimit", result.termLimit());
            response.put("currency", result.currency());
        } catch (com.bankingtech.product.exception.ApiException | IllegalArgumentException error) {
            response.put("valid", false);
            response.put("message", error.getMessage());
        }
        kafka.send("product-quote-replies-v1", correlation, json.writeValueAsString(response)).get(12, TimeUnit.SECONDS);
    }
}
