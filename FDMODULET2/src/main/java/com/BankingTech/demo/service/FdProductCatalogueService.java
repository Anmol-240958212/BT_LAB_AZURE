package com.BankingTech.demo.service;

import com.BankingTech.demo.repository.FdProductCatalogueRepository;
import com.BankingTech.demo.entity.FdProductCatalogue;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import java.time.LocalDate;
import java.util.*;

@Service
public class FdProductCatalogueService {
    private final FdProductCatalogueRepository repository;
    private final JsonMapper json = new JsonMapper();
    public FdProductCatalogueService(FdProductCatalogueRepository repository) { this.repository = repository; }

    @KafkaListener(topics = "product-catalogue-v1", containerFactory = "fdCatalogueFactory")
    @Transactional
    public void consume(ConsumerRecord<String, String> record) {
        var event = json.readTree(record.value());
        if (event.path("schemaVersion").asInt() != 1) throw new IllegalArgumentException("Unsupported catalogue schema");
        var product = event.path("product");
        String code = product.path("productCode").asText();
        if (code.isBlank() || !code.equals(record.key())) throw new IllegalArgumentException("Invalid product key");
        var existing = repository.findById(code);
        if (existing.isPresent() && existing.get().getKafkaOffset() >= record.offset()) return;
        var row = existing.orElseGet(FdProductCatalogue::new);
        row.setProductCode(code); row.setPayload(product.toString()); row.setKafkaOffset(record.offset());
        repository.save(row);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> available() {
        var today = LocalDate.now();
        List<Map<String, Object>> result = new ArrayList<>();
        for (var row : repository.findAll()) {
            var product = json.readTree(row.getPayload());
            if (!"ACTIVE".equals(product.path("status").asText()) || !"FD".equals(product.path("productType").asText())) continue;
            if (LocalDate.parse(product.path("effectiveDate").asText()).isAfter(today)) continue;
            if (!product.path("effectiveTo").isNull() && !product.path("effectiveTo").isMissingNode()
                    && LocalDate.parse(product.path("effectiveTo").asText()).isBefore(today)) continue;
            result.add(json.convertValue(product, Map.class));
        }
        result.sort(Comparator.comparing(product -> product.get("productCode").toString()));
        return result;
    }
}
