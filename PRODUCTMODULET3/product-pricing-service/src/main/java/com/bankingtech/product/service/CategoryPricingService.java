package com.bankingtech.product.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.bankingtech.product.dto.CategoryRateRequestDto;
import com.bankingtech.product.dto.CategoryRateResponseDto;
import com.bankingtech.product.dto.EffectiveRateResponseDto;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.entity.Product;
import com.bankingtech.product.entity.ProductCharacteristic;
import com.bankingtech.product.entity.ProductRule;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.entity.enums.DurationUnit;
import com.bankingtech.product.exception.ApiException;
import com.bankingtech.product.repository.ProductRepository;
import com.bankingtech.product.repository.ProductRuleRepository;
import com.bankingtech.product.repository.ProductCharacteristicRepository;

@Service
public class CategoryPricingService {
    private static final Logger logger = LoggerFactory.getLogger(CategoryPricingService.class);
    private static final String RATE_CAP_RULE_TYPE = "RATE_CAP";
    private final ProductRepository products;
    private final ProductRuleRepository rules;
    private final ProductService productService;
    private final ObjectMapper objectMapper;
    private final ProductAuditService auditService;
    private final ProductCharacteristicRepository characteristics;

    public CategoryPricingService(ProductRepository products, ProductRuleRepository rules,
                                  ProductService productService, ObjectMapper objectMapper,
                                  ProductAuditService auditService,
                                  ProductCharacteristicRepository characteristics) {
        this.products = products;
        this.rules = rules;
        this.productService = productService;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
        this.characteristics = characteristics;
    }

    @Transactional
    public CategoryRateResponseDto add(String productCode, CategoryRateRequestDto request, String actor) {
        Product product = findProduct(productCode);
        String code = normalizeCode(request.categoryCode());
        if (request.minAge() != null && request.maxAge() != null && request.maxAge() < request.minAge()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "maxAge must be greater than or equal to minAge");
        }
        if (request.effectiveTo() != null && request.effectiveTo().isBefore(request.effectiveFrom())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "effectiveTo must be on or after effectiveFrom");
        }
        boolean duplicateCategory = rules.existsByProductProductIdAndRuleCodeIgnoreCase(product.getProductId(), code)
                || rules.findAllByProductProductIdAndRuleType(product.getProductId(), ProductRule.TYPE_CATEGORY_PRICING)
                        .stream().anyMatch(existing -> categoryCode(decode(existing.getRuleDefinition()), existing.getRuleCode())
                                .equalsIgnoreCase(code));
        if (duplicateCategory) {
            throw new ApiException(HttpStatus.CONFLICT, "A category rate with this categoryCode already exists for the product");
        }
        ProductRule rule = new ProductRule(code, request.displayName().trim(),
                ProductRule.TYPE_CATEGORY_PRICING, encode(request), request.effectiveFrom());
        rule.setEffectiveTo(request.effectiveTo());
        rule.setStatus(RecordStatus.ACTIVE);
        rule.setProduct(product);
        ProductRule saved = rules.save(rule);
        if (auditService != null) {
            auditService.record(product.getProductCode(), "CATEGORY_RATE_CREATED", actor,
                    "{\"categoryCode\":\"" + code + "\"}");
        }
        logger.info("Category rate {} added to product {} by {}", code, productCode, actor);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CategoryRateResponseDto> list(String productCode, LocalDate date) {
        Product product = findProduct(productCode);
        LocalDate at = date == null ? LocalDate.now() : date;
        return rules.findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
                        product.getProductId(), ProductRule.TYPE_CATEGORY_PRICING, RecordStatus.ACTIVE, at).stream()
                .filter(rule -> rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(at))
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EffectiveRateResponseDto effectiveRate(String productCode, List<String> requestedCategories,
                                                  Integer customerAge, String customerGender, LocalDate date,
                                                  BigDecimal principal, Integer term, DurationUnit termUnit) {
        if (customerAge != null && (customerAge < 0 || customerAge > 130)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "customerAge must be between 0 and 130");
        }
        if (customerGender != null && !customerGender.matches("(?i)M|F|X")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "customerGender must be M, F, or X");
        }
        LocalDate at = date == null ? LocalDate.now() : date;
        Product product = findProduct(productCode);
        ProductResponseDto details = productService.get(productCode);
        if (details.rateLimit() == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Product rateLimit is not configured");
        }
        BigDecimal baseRate = productService.findBaseRate(productCode, at, principal, term, termUnit);
        BigDecimal floor = details.rateLimit().min();
        BigDecimal cap = details.rateLimit().max();
        if (baseRate.compareTo(floor) < 0 || baseRate.compareTo(cap) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Configured base rate is outside the product rateLimit");
        }

        List<String> selected = requestedCategories == null ? List.of() : requestedCategories;
        Set<String> normalized = new LinkedHashSet<>();
        for (String value : selected) {
            if (value == null || value.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "category codes cannot be blank");
            String key = normalizeCode(value);
            if (!normalized.add(key)) throw new ApiException(HttpStatus.BAD_REQUEST, "category codes must not contain duplicates");
        }

        List<ProductRule> available = rules.findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
                product.getProductId(), ProductRule.TYPE_CATEGORY_PRICING, RecordStatus.ACTIVE, at).stream()
                .filter(rule -> rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(at)).toList();
        Map<String, ProductRule> byCode = new HashMap<>();
        for (ProductRule rule : available) {
            byCode.putIfAbsent(categoryCode(decode(rule.getRuleDefinition()), rule.getRuleCode()), rule);
        }

        BigDecimal totalAdjustment = BigDecimal.ZERO;
        List<String> applied = new ArrayList<>();
        for (String key : normalized) {
            ProductRule rule = byCode.get(key);
            if (rule == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown or inactive category: " + key);
            JsonNode definition = decode(rule.getRuleDefinition());
            Integer minAge = integerOrNull(definition.get("minAge"));
            Integer maxAge = integerOrNull(definition.get("maxAge"));
            if ((minAge != null || maxAge != null) && customerAge == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "customerAge is required for age-qualified categories");
            }
            if (customerAge != null && ((minAge != null && customerAge < minAge)
                    || (maxAge != null && customerAge > maxAge))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Customer does not meet age criteria for category " + key);
            }
            String requiredGender = definition.path("gender").asText();
            if (!requiredGender.isBlank() && (customerGender == null
                    || !requiredGender.equalsIgnoreCase(customerGender.trim()))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Customer does not meet gender criteria for category " + key);
            }
            JsonNode adjustment = definition.get("adjustmentPercent");
            if (adjustment == null || !adjustment.isNumber()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Category rate definition is missing adjustmentPercent");
            }
            totalAdjustment = totalAdjustment.add(adjustment.decimalValue());
            applied.add(key);
        }
        BigDecimal additionalCap = findAdditionalRateCap(product.getProductId(), at, cap.subtract(baseRate));
        BigDecimal headroom = cap.subtract(baseRate).max(BigDecimal.ZERO);
        BigDecimal appliedAdjustment = totalAdjustment.min(additionalCap).min(headroom);
        boolean capped = totalAdjustment.compareTo(appliedAdjustment) > 0;
        BigDecimal effectiveRate = baseRate.add(appliedAdjustment).setScale(4, RoundingMode.HALF_UP);
        return new EffectiveRateResponseDto(product.getProductCode(), baseRate.setScale(4, RoundingMode.HALF_UP),
                appliedAdjustment.setScale(4, RoundingMode.HALF_UP), effectiveRate,
                cap.setScale(4, RoundingMode.HALF_UP), additionalCap.setScale(4, RoundingMode.HALF_UP),
                capped, applied);
    }

    private BigDecimal findAdditionalRateCap(Long productId, LocalDate date, BigDecimal headroom) {
        ProductCharacteristic characteristicCap = characteristics
                .findByProductProductIdAndCharacteristicNameIgnoreCase(productId, ProductService.CATEGORY_RATE_CAP)
                .filter(value -> !value.getEffectiveFrom().isAfter(date))
                .filter(value -> value.getEffectiveTo() == null || !value.getEffectiveTo().isBefore(date))
                .orElse(null);
        if (characteristicCap != null && characteristicCap.getValuePercentage() != null) {
            return characteristicCap.getValuePercentage();
        }
        return rules.findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
                        productId, RATE_CAP_RULE_TYPE, RecordStatus.ACTIVE, date).stream()
                .filter(rule -> rule.getEffectiveTo() == null || !rule.getEffectiveTo().isBefore(date))
                .max(java.util.Comparator.comparing(ProductRule::getEffectiveFrom))
                .map(rule -> {
                    JsonNode definition = decode(rule.getRuleDefinition());
                    JsonNode configured = definition.get("maxAdditionalPercent");
                    if (configured == null || !configured.isNumber() || configured.decimalValue().signum() < 0) {
                        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                                "RATE_CAP rule has an invalid maxAdditionalPercent");
                    }
                    return configured.decimalValue();
                })
                .orElse(headroom.max(BigDecimal.ZERO));
    }

    private Product findProduct(String productCode) {
        if (productCode == null || productCode.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "productCode is required");
        return products.findByProductCodeIgnoreCase(productCode.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private String normalizeCode(String value) {
        String code = value.trim().toUpperCase(Locale.ROOT);
        if (!code.matches("[A-Z0-9_-]{1,30}")) throw new ApiException(HttpStatus.BAD_REQUEST, "categoryCode has invalid characters");
        return code;
    }

    private String encode(CategoryRateRequestDto request) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "categoryCode", normalizeCode(request.categoryCode()),
                    "displayName", request.displayName().trim(),
                    "adjustmentPercent", request.adjustmentPercent(),
                    "minAge", request.minAge() == null ? -1 : request.minAge(),
                    "maxAge", request.maxAge() == null ? -1 : request.maxAge(),
                    "gender", request.gender() == null ? "" : request.gender().trim().toUpperCase(Locale.ROOT)));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not encode category rate", ex);
        }
    }

    private JsonNode decode(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Stored category rate definition is invalid");
        }
    }

    private Integer integerOrNull(JsonNode node) {
        if (node == null || node.isNull() || !node.canConvertToInt() || node.intValue() < 0) return null;
        return node.intValue();
    }

    private CategoryRateResponseDto toResponse(ProductRule rule) {
        JsonNode definition = decode(rule.getRuleDefinition());
        return new CategoryRateResponseDto(categoryCode(definition, rule.getRuleCode()), rule.getRuleName(),
                definition.path("adjustmentPercent").decimalValue(), integerOrNull(definition.get("minAge")),
                integerOrNull(definition.get("maxAge")), blankToNull(definition.path("gender").asText()),
                rule.getEffectiveFrom(), rule.getEffectiveTo());
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value; }

    private String categoryCode(JsonNode definition, String fallback) {
        String code = definition.path("categoryCode").asText();
        if (code.isBlank()) code = definition.path("category").asText();
        if (code.isBlank()) code = fallback;
        return code.toUpperCase(Locale.ROOT);
    }
}
