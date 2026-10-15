package com.bankingtech.product.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bankingtech.product.dto.PageResponseDto;
import com.bankingtech.product.dto.ProductChargeRequestDto;
import com.bankingtech.product.dto.ProductChargeResponseDto;
import com.bankingtech.product.dto.ProductCreateRequestDto;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.dto.ProductUpdateRequestDto;
import com.bankingtech.product.dto.RateMatrixRequestDto;
import com.bankingtech.product.dto.RateMatrixResponseDto;
import com.bankingtech.product.entity.Charge;
import com.bankingtech.product.entity.InterestRate;
import com.bankingtech.product.entity.Product;
import com.bankingtech.product.entity.ProductCharacteristic;
import com.bankingtech.product.entity.ProductCharge;
import com.bankingtech.product.entity.ProductPricing;
import com.bankingtech.product.entity.ProductTypeMaster;
import com.bankingtech.product.entity.RateMatrix;
import com.bankingtech.product.entity.enums.CharacteristicDataType;
import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.DurationUnit;
import com.bankingtech.product.entity.enums.PricingType;
import com.bankingtech.product.entity.enums.RateType;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.exception.ApiException;
import com.bankingtech.product.repository.ChargeRepository;
import com.bankingtech.product.repository.InterestRateRepository;
import com.bankingtech.product.repository.ProductCharacteristicRepository;
import com.bankingtech.product.repository.ProductPricingRepository;
import com.bankingtech.product.repository.ProductRepository;
import com.bankingtech.product.repository.ProductTypeMasterRepository;
import com.bankingtech.product.repository.RateMatrixRepository;

@Service
public class ProductService {
    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);
    public static final String TERM_MIN_MONTHS = "TERM_MIN_MONTHS";
    public static final String TERM_MAX_MONTHS = "TERM_MAX_MONTHS";
    public static final String RATE_MIN = "RATE_MIN";
    public static final String RATE_MAX = "RATE_MAX";
    public static final String ALLOWED_CUSTOMER_ROLES = "ALLOWED_CUSTOMER_ROLES";
    public static final String TRANSACTION_TYPES = "TRANSACTION_TYPES";
    public static final String CATEGORY_RATE_CAP = "CATEGORY_RATE_CAP";

    private final ProductRepository products;
    private final ProductTypeMasterRepository productTypes;
    private final ProductCharacteristicRepository characteristics;
    private final ProductPricingRepository pricings;
    private final InterestRateRepository interestRates;
    private final ChargeRepository charges;
    private final ProductAuditService auditService;
    private final RateMatrixRepository rateMatrices;

    public ProductService(ProductRepository products, ProductTypeMasterRepository productTypes,
                          ProductCharacteristicRepository characteristics, ProductPricingRepository pricings,
                          InterestRateRepository interestRates, ChargeRepository charges,
                          ProductAuditService auditService, RateMatrixRepository rateMatrices) {
        this.products = products;
        this.productTypes = productTypes;
        this.characteristics = characteristics;
        this.pricings = pricings;
        this.interestRates = interestRates;
        this.charges = charges;
        this.auditService = auditService;
        this.rateMatrices = rateMatrices;
    }

    @Transactional
    public ProductResponseDto create(ProductCreateRequestDto request, String actor) {
        String code = request.productCode().trim().toUpperCase(Locale.ROOT);
        if (products.existsByProductCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "Product code is already in use");
        }
        validateDateRange(request.effectiveDate(), request.effectiveTo());
        validateLimits(request.termLimit().min(), request.termLimit().max(),
                request.rateLimit().min(), request.rateLimit().max(), request.baseRate());

        ProductTypeMaster type = productTypes.findByTypeCodeIgnoreCase(request.productType().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown product type"));
        Product product = new Product();
        product.setProductCode(code);
        product.setProductName(request.productName().trim());
        product.setProductType(type);
        product.setCurrencyCode(normalizeCurrency(request.currency()));
        product.setDescription(trimToNull(request.description()));
        product.setEffectiveFrom(request.effectiveDate());
        product.setEffectiveTo(request.effectiveTo());
        product.setStatus(RecordStatus.ACTIVE);

        product.addCharacteristic(ProductCharacteristic.ofNumber(TERM_MIN_MONTHS,
                BigDecimal.valueOf(request.termLimit().min()), request.effectiveDate()));
        product.addCharacteristic(ProductCharacteristic.ofNumber(TERM_MAX_MONTHS,
                BigDecimal.valueOf(request.termLimit().max()), request.effectiveDate()));
        product.addCharacteristic(ProductCharacteristic.ofPercentage(RATE_MIN,
                request.rateLimit().min(), request.effectiveDate()));
        product.addCharacteristic(ProductCharacteristic.ofPercentage(RATE_MAX,
                request.rateLimit().max(), request.effectiveDate()));
        if (request.maxAdditionalPercent() != null) {
            product.addCharacteristic(ProductCharacteristic.ofPercentage(CATEGORY_RATE_CAP,
                    request.maxAdditionalPercent(), request.effectiveDate()));
        }
        List<String> roles = request.allowedCustomerRoles() == null || request.allowedCustomerRoles().isEmpty()
                ? List.of("OWNER") : request.allowedCustomerRoles().stream().map(String::trim).distinct().toList();
        product.addCharacteristic(ProductCharacteristic.ofText(ALLOWED_CUSTOMER_ROLES,
                String.join(",", roles), request.effectiveDate()));
        if (request.transactionTypes() != null && !request.transactionTypes().isEmpty()) {
            product.addCharacteristic(ProductCharacteristic.ofText(TRANSACTION_TYPES,
                    normalizeList(request.transactionTypes()), request.effectiveDate()));
        }

        if (request.baseRate() != null) {
            ProductPricing pricing = new ProductPricing(PricingType.STANDARD, request.effectiveDate());
            product.addPricing(pricing);
            InterestRate rate = new InterestRate(request.baseRate(),
                    request.rateType() == null ? RateType.COMPOUND : request.rateType(),
                    request.frequency() == null ? Frequency.QUARTERLY : request.frequency(),
                    request.effectiveDate());
            rate.setEffectiveTo(request.effectiveTo());
            pricing.addInterestRate(rate);
        }
        if (request.rateMatrix() != null && !request.rateMatrix().isEmpty()) {
            validateRateMatrices(request.rateMatrix(), request.rateLimit());
            ProductPricing tieredPricing = new ProductPricing(PricingType.TIERED, request.effectiveDate());
            tieredPricing.setEffectiveTo(request.effectiveTo());
            product.addPricing(tieredPricing);
            for (RateMatrixRequestDto matrixRequest : request.rateMatrix()) {
                validateRateMatrix(matrixRequest, request.rateLimit());
                RateMatrix matrix = new RateMatrix(matrixRequest.minAmount(), matrixRequest.maxAmount(),
                        matrixRequest.durationFrom(), matrixRequest.durationTo(), matrixRequest.durationUnit(),
                        matrixRequest.rate(), matrixRequest.effectiveFrom());
                matrix.setEffectiveTo(matrixRequest.effectiveTo());
                tieredPricing.addRateMatrix(matrix);
            }
        }
        if (request.charges() != null) {
            request.charges().forEach(charge -> addCharge(product, charge, request.effectiveDate(), request.effectiveTo()));
        }
        Product saved = products.save(product);
        auditService.record(saved.getProductCode(), "PRODUCT_CREATED", actor, "{}");
        logger.info("Product {} created by {}", saved.getProductCode(), actor);
        return toResponse(saved, characteristics.findAllByProductProductId(saved.getProductId()));
    }

    @Transactional(readOnly = true)
    public ProductResponseDto get(String productCode) {
        Product product = findProduct(productCode);
        return toResponse(product, characteristics.findAllByProductProductId(product.getProductId()));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<ProductResponseDto> search(String typeCode, LocalDate startDate, LocalDate endDate,
                                                      RecordStatus status, int page, int size) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "endDate must be on or after startDate");
        }
        if (page < 0 || size < 1 || size > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "page must be non-negative and size must be between 1 and 100");
        }
        Page<Product> result = products.search(blankToNull(typeCode), startDate, endDate, status,
                PageRequest.of(page, size, Sort.unsorted()));
        List<ProductResponseDto> content = result.getContent().stream().map(product -> toResponse(product,
                characteristics.findAllByProductProductId(product.getProductId()))).toList();
        return new PageResponseDto<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public ProductResponseDto update(String productCode, ProductUpdateRequestDto request, String actor) {
        if (request.productName() == null && request.description() == null && request.effectiveDate() == null
                && request.effectiveTo() == null && request.status() == null && request.termLimit() == null
                && request.rateLimit() == null && request.baseRate() == null
                && request.transactionTypes() == null && request.maxAdditionalPercent() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one product field must be supplied");
        }
        Product product = findProduct(productCode);
        if (request.productName() != null) {
            if (request.productName().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "productName cannot be blank");
            }
            product.setProductName(request.productName().trim());
        }
        if (request.description() != null) product.setDescription(trimToNull(request.description()));
        LocalDate effectiveFrom = request.effectiveDate() == null ? product.getEffectiveFrom() : request.effectiveDate();
        LocalDate effectiveTo = request.effectiveTo() == null ? product.getEffectiveTo() : request.effectiveTo();
        validateDateRange(effectiveFrom, effectiveTo);
        product.setEffectiveFrom(effectiveFrom);
        product.setEffectiveTo(effectiveTo);
        if (request.status() != null) product.setStatus(request.status());

        List<ProductCharacteristic> existing = characteristics.findAllByProductProductId(product.getProductId());
        BigDecimal termMin = value(existing, TERM_MIN_MONTHS);
        BigDecimal termMax = value(existing, TERM_MAX_MONTHS);
        BigDecimal rateMin = value(existing, RATE_MIN);
        BigDecimal rateMax = value(existing, RATE_MAX);
        if (request.termLimit() != null) {
            termMin = BigDecimal.valueOf(request.termLimit().min());
            termMax = BigDecimal.valueOf(request.termLimit().max());
        }
        if (request.rateLimit() != null) {
            rateMin = request.rateLimit().min();
            rateMax = request.rateLimit().max();
        }
        BigDecimal categoryRateCap = request.maxAdditionalPercent();
        BigDecimal baseRate = request.baseRate();
        if (baseRate == null && request.rateLimit() != null) {
            try {
                baseRate = findBaseRate(product.getProductId(), LocalDate.now());
            } catch (ApiException ex) {
                if (ex.getStatus() != HttpStatus.NOT_FOUND) throw ex;
            }
        }
        if (termMin != null && termMax != null && termMin.compareTo(termMax) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Term limit min must not exceed max");
        }
        if (rateMin != null && rateMax != null && rateMin.compareTo(rateMax) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rate limit min must not exceed max");
        }
        if (baseRate != null && rateMin != null && rateMax != null
                && (baseRate.compareTo(rateMin) < 0 || baseRate.compareTo(rateMax) > 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "baseRate must fall within rateLimit");
        }
        if (request.rateLimit() != null) {
            validateConfiguredRates(product, rateMin, rateMax);
        }
        if (request.termLimit() != null) {
            upsertNumber(product, existing, TERM_MIN_MONTHS, termMin, effectiveFrom);
            upsertNumber(product, existing, TERM_MAX_MONTHS, termMax, effectiveFrom);
        }
        if (request.rateLimit() != null) {
            upsertPercentage(product, existing, RATE_MIN, rateMin, effectiveFrom);
            upsertPercentage(product, existing, RATE_MAX, rateMax, effectiveFrom);
        }
        if (request.maxAdditionalPercent() != null) {
            upsertPercentage(product, existing, CATEGORY_RATE_CAP, categoryRateCap, effectiveFrom);
        }
        if (request.transactionTypes() != null) {
            upsertText(product, existing, TRANSACTION_TYPES, normalizeList(request.transactionTypes()), effectiveFrom);
        }
        if (request.baseRate() != null) upsertBaseRate(product, request.baseRate(), effectiveFrom,
                request.rateType(), request.frequency());
        Product saved = products.save(product);
        auditService.record(saved.getProductCode(), "PRODUCT_UPDATED", actor, "{}");
        logger.info("Product {} updated by {}", saved.getProductCode(), actor);
        return toResponse(saved, characteristics.findAllByProductProductId(saved.getProductId()));
    }

    @Transactional(readOnly = true)
    public BigDecimal findBaseRate(String productCode, LocalDate date) {
        return findBaseRate(productCode, date, null, null, null);
    }

    @Transactional(readOnly = true)
    public BigDecimal findBaseRate(String productCode, LocalDate date, BigDecimal amount,
                                  Integer duration, DurationUnit durationUnit) {
        Product product = findProduct(productCode);
        if (!product.isActiveOn(date)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Product is not active on the requested date");
        }
        if ((amount == null) != (duration == null) || (amount == null) != (durationUnit == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "amount, duration, and durationUnit must be supplied together");
        }
        if (amount != null && (amount.signum() <= 0 || duration <= 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "amount and duration must be positive");
        }
        return findBaseRate(product.getProductId(), date, amount, duration, durationUnit);
    }

    private BigDecimal findBaseRate(Long productId, LocalDate date) {
        return findBaseRate(productId, date, null, null, null);
    }

    private BigDecimal findBaseRate(Long productId, LocalDate date, BigDecimal amount,
                                    Integer duration, DurationUnit durationUnit) {
        if (amount != null) {
            validateRequestedTerm(productId, date, duration, durationUnit);
        }
        List<ProductPricing> candidates = pricings.findAllByProductProductIdAndStatusAndEffectiveFromLessThanEqual(
                productId, RecordStatus.ACTIVE, date).stream()
                .filter(p -> p.getEffectiveTo() == null || !p.getEffectiveTo().isBefore(date))
                .sorted(Comparator.comparingInt((ProductPricing p) -> pricingPriority(p.getPricingType()))
                        .thenComparing(ProductPricing::getEffectiveFrom, Comparator.reverseOrder()))
                .toList();
        for (ProductPricing pricing : candidates) {
            if (pricing.getPricingType() == PricingType.TIERED) {
                if (amount == null) continue;
                List<RateMatrix> matchingMatrices = rateMatrices.findAllByPricingPricingId(pricing.getPricingId()).stream()
                        .filter(matrix -> matrix.getDurationUnit() == durationUnit && matrix.matches(amount, duration))
                        .filter(matrix -> !matrix.getEffectiveFrom().isAfter(date))
                        .filter(matrix -> matrix.getEffectiveTo() == null || !matrix.getEffectiveTo().isBefore(date))
                        .toList();
                if (!matchingMatrices.isEmpty()) {
                    LocalDate latestMatrixDate = matchingMatrices.stream()
                            .map(RateMatrix::getEffectiveFrom).max(LocalDate::compareTo).orElseThrow();
                    List<RateMatrix> latestMatches = matchingMatrices.stream()
                            .filter(matrix -> matrix.getEffectiveFrom().equals(latestMatrixDate)).toList();
                    if (latestMatches.size() > 1) {
                        throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                                "Multiple active rate-matrix bands match this amount and term");
                    }
                    return latestMatches.get(0).getRate();
                }
                continue;
            }
            List<InterestRate> rates = interestRates
                    .findAllByPricingPricingIdAndEffectiveFromLessThanEqual(pricing.getPricingId(), date).stream()
                    .filter(rate -> rate.getEffectiveTo() == null || !rate.getEffectiveTo().isBefore(date))
                    .sorted(Comparator.comparing(InterestRate::getEffectiveFrom).reversed()).toList();
            if (!rates.isEmpty()) return rates.get(0).getRate();
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "No base interest rate is configured for this product and date");
    }

    private void upsertBaseRate(Product product, BigDecimal rate, LocalDate effectiveFrom,
                                RateType rateType, Frequency frequency) {
        ProductPricing pricing = pricings.findByProductProductIdAndPricingTypeAndEffectiveFrom(
                        product.getProductId(), PricingType.STANDARD, effectiveFrom)
                .orElseGet(() -> {
                    ProductPricing created = new ProductPricing(PricingType.STANDARD, effectiveFrom);
                    created.setEffectiveTo(product.getEffectiveTo());
                    product.addPricing(created);
                    return created;
                });
        List<InterestRate> existingRates = pricing.getPricingId() == null ? List.of()
                : interestRates.findAllByPricingPricingIdAndEffectiveFromLessThanEqual(
                        pricing.getPricingId(), effectiveFrom);
        InterestRate interestRate = existingRates.stream()
                .filter(r -> r.getEffectiveFrom().equals(effectiveFrom))
                .findFirst()
                .orElseGet(() -> {
                    InterestRate created = new InterestRate(rate,
                            rateType == null ? RateType.COMPOUND : rateType,
                            frequency == null ? Frequency.QUARTERLY : frequency, effectiveFrom);
                    created.setEffectiveTo(product.getEffectiveTo());
                    pricing.addInterestRate(created);
                    return created;
                });
        interestRate.setRate(rate);
        if (rateType != null) interestRate.setRateType(rateType);
        if (frequency != null) interestRate.setFrequency(frequency);
    }

    private int pricingPriority(PricingType type) {
        return switch (type) {
            case PROMOTIONAL -> 0;
            case TIERED -> 1;
            case STANDARD -> 2;
        };
    }

    private Product findProduct(String code) {
        if (code == null || code.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "productCode is required");
        return products.findByProductCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private void addCharge(Product product, ProductChargeRequestDto request, LocalDate from, LocalDate to) {
        Charge charge = charges.findByChargeCodeIgnoreCase(request.chargeCode().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "Unknown charge code: " + request.chargeCode()));
        ProductCharge productCharge;
        if (request.calculationType() == com.bankingtech.product.entity.enums.CalculationType.FLAT) {
            if (request.amount() == null || request.percentage() != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "FLAT charge requires amount and must not include percentage");
            }
            productCharge = ProductCharge.flat(charge, request.amount(), request.frequency(), from);
        } else {
            if (request.percentage() == null || request.amount() != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PERCENTAGE charge requires percentage and must not include amount");
            }
            productCharge = ProductCharge.percentage(charge, request.percentage(), request.frequency(), from);
        }
        productCharge.setCurrencyCode(request.currencyCode() == null || request.currencyCode().isBlank()
                ? null : normalizeCurrency(request.currencyCode()));
        productCharge.setEffectiveTo(to);
        product.addCharge(productCharge);
    }

    private ProductResponseDto toResponse(Product product, List<ProductCharacteristic> productCharacteristics) {
        BigDecimal termMin = value(productCharacteristics, TERM_MIN_MONTHS);
        BigDecimal termMax = value(productCharacteristics, TERM_MAX_MONTHS);
        BigDecimal rateMin = value(productCharacteristics, RATE_MIN);
        BigDecimal rateMax = value(productCharacteristics, RATE_MAX);
        BigDecimal baseRate = null;
        BigDecimal additionalRateCap = value(productCharacteristics, CATEGORY_RATE_CAP);
        try {
            baseRate = findBaseRate(product.getProductId(), LocalDate.now());
        } catch (ApiException ignored) {
            // A product may be defined before its rate card is configured.
        }
        String rolesValue = textValue(productCharacteristics, ALLOWED_CUSTOMER_ROLES);
        List<String> roles = rolesValue == null || rolesValue.isBlank() ? List.of()
                : java.util.Arrays.stream(rolesValue.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        String transactionsValue = textValue(productCharacteristics, TRANSACTION_TYPES);
        List<String> transactionTypes = transactionsValue == null || transactionsValue.isBlank() ? List.of()
                : java.util.Arrays.stream(transactionsValue.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        List<ProductChargeResponseDto> chargeDtos = product.getCharges().stream()
                .filter(c -> c.getStatus() == RecordStatus.ACTIVE)
                .map(c -> new ProductChargeResponseDto(c.getCharge().getChargeCode(), c.getCharge().getChargeName(),
                        c.getCalculationType(), c.getAmount(), c.getPercentage(),
                        c.getCurrencyCode() == null ? product.getCurrencyCode() : c.getCurrencyCode(), c.getFrequency()))
                .toList();
        List<RateMatrixResponseDto> matrixDtos = product.getPricings().stream()
                .filter(p -> p.getStatus() == RecordStatus.ACTIVE)
                .flatMap(p -> rateMatrices.findAllByPricingPricingId(p.getPricingId()).stream())
                .map(matrix -> new RateMatrixResponseDto(matrix.getMinAmount(), matrix.getMaxAmount(),
                        matrix.getDurationFrom(), matrix.getDurationTo(), matrix.getDurationUnit(),
                        matrix.getRate(), matrix.getEffectiveFrom(), matrix.getEffectiveTo()))
                .toList();
        return new ProductResponseDto(product.getProductCode(), product.getProductName(),
                product.getProductType().getTypeCode(), product.getProductType().getTypeName(),
                product.getCurrencyCode(), product.getDescription(), product.getEffectiveFrom(), product.getEffectiveTo(),
                product.getStatus(), termMin == null || termMax == null ? null
                        : new com.bankingtech.product.dto.TermLimitDto(termMin.intValue(), termMax.intValue()),
                rateMin == null || rateMax == null ? null
                        : new com.bankingtech.product.dto.RateLimitDto(rateMin, rateMax),
                baseRate, additionalRateCap, chargeDtos, roles, transactionTypes, matrixDtos);
    }

    private void upsertNumber(Product product, List<ProductCharacteristic> existing, String name,
                              BigDecimal value, LocalDate from) {
        ProductCharacteristic characteristic = findCharacteristic(existing, name);
        if (characteristic == null) product.addCharacteristic(ProductCharacteristic.ofNumber(name, value, from));
        else {
            characteristic.setCharacteristicName(name);
            characteristic.setDataType(CharacteristicDataType.NUMBER);
            characteristic.setValueNumber(value);
        }
    }

    private void upsertPercentage(Product product, List<ProductCharacteristic> existing, String name,
                                  BigDecimal value, LocalDate from) {
        ProductCharacteristic characteristic = findCharacteristic(existing, name);
        if (characteristic == null) product.addCharacteristic(ProductCharacteristic.ofPercentage(name, value, from));
        else {
            characteristic.setCharacteristicName(name);
            characteristic.setDataType(CharacteristicDataType.PERCENTAGE);
            characteristic.setValuePercentage(value);
        }
    }

    private void upsertText(Product product, List<ProductCharacteristic> existing, String name,
                            String value, LocalDate from) {
        ProductCharacteristic characteristic = findCharacteristic(existing, name);
        if (characteristic == null) product.addCharacteristic(ProductCharacteristic.ofText(name, value, from));
        else characteristic.setValueText(value);
    }

    private String normalizeList(List<String> values) {
        return values.stream().map(String::trim).map(s -> s.toUpperCase(Locale.ROOT)).distinct()
                .collect(java.util.stream.Collectors.joining(","));
    }

    private BigDecimal value(List<ProductCharacteristic> values, String name) {
        return values.stream().filter(c -> matchesCharacteristic(c.getCharacteristicName(), name)).findFirst()
                .map(c -> c.getDataType() == CharacteristicDataType.PERCENTAGE
                        ? c.getValuePercentage() : c.getValueNumber()).orElse(null);
    }

    private ProductCharacteristic findCharacteristic(List<ProductCharacteristic> values, String name) {
        return values.stream().filter(c -> matchesCharacteristic(c.getCharacteristicName(), name)).findFirst().orElse(null);
    }

    private boolean matchesCharacteristic(String actual, String canonical) {
        if (actual.equalsIgnoreCase(canonical)) return true;
        return switch (canonical) {
            case TERM_MIN_MONTHS -> actual.equalsIgnoreCase("MIN_TERM_MONTHS");
            case TERM_MAX_MONTHS -> actual.equalsIgnoreCase("MAX_TERM_MONTHS");
            case RATE_MIN -> actual.equalsIgnoreCase("MIN_RATE");
            case RATE_MAX -> actual.equalsIgnoreCase("MAX_RATE");
            default -> false;
        };
    }

    private String textValue(List<ProductCharacteristic> values, String name) {
        return values.stream().filter(c -> c.getCharacteristicName().equalsIgnoreCase(name)).findFirst()
                .map(ProductCharacteristic::getValueText).orElse(null);
    }

    private void validateLimits(int termMin, int termMax, BigDecimal rateMin, BigDecimal rateMax, BigDecimal baseRate) {
        if (termMin < 1 || termMax < termMin) throw new ApiException(HttpStatus.BAD_REQUEST, "Term limit must satisfy 1 <= min <= max");
        if (rateMin.compareTo(rateMax) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Rate limit min must not exceed max");
        if (baseRate != null && (baseRate.compareTo(rateMin) < 0 || baseRate.compareTo(rateMax) > 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "baseRate must fall within rateLimit");
        }
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || (to != null && to.isBefore(from))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "effectiveTo must be on or after effectiveDate");
        }
    }

    private void validateRateMatrix(RateMatrixRequestDto matrix, com.bankingtech.product.dto.RateLimitDto limits) {
        if (matrix.minAmount().compareTo(matrix.maxAmount()) > 0
                || matrix.durationFrom() < 1 || matrix.durationTo() < 1
                || matrix.durationFrom() > matrix.durationTo()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Rate matrix amounts must be ordered and duration bands must satisfy 1 <= from <= to");
        }
        validateDateRange(matrix.effectiveFrom(), matrix.effectiveTo());
        if (limits != null && (matrix.rate().compareTo(limits.min()) < 0 || matrix.rate().compareTo(limits.max()) > 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rate matrix rates must fall within rateLimit");
        }
    }

    private void validateConfiguredRates(Product product, BigDecimal min, BigDecimal max) {
        for (ProductPricing pricing : product.getPricings()) {
            boolean interestRateOutsideLimits = pricing.getInterestRates().stream()
                    .anyMatch(rate -> rate.getRate().compareTo(min) < 0 || rate.getRate().compareTo(max) > 0);
            boolean matrixRateOutsideLimits = pricing.getRateMatrices().stream()
                    .anyMatch(matrix -> matrix.getRate().compareTo(min) < 0 || matrix.getRate().compareTo(max) > 0);
            if (interestRateOutsideLimits || matrixRateOutsideLimits) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Existing configured rates must remain within the new rateLimit");
            }
        }
    }

    private void validateRateMatrices(List<RateMatrixRequestDto> matrices,
                                      com.bankingtech.product.dto.RateLimitDto limits) {
        for (RateMatrixRequestDto matrix : matrices) {
            validateRateMatrix(matrix, limits);
        }
        for (int i = 0; i < matrices.size(); i++) {
            RateMatrixRequestDto left = matrices.get(i);
            for (int j = i + 1; j < matrices.size(); j++) {
                RateMatrixRequestDto right = matrices.get(j);
                boolean sameUnit = left.durationUnit() == right.durationUnit();
                boolean amountOverlap = left.minAmount().compareTo(right.maxAmount()) <= 0
                        && right.minAmount().compareTo(left.maxAmount()) <= 0;
                boolean termOverlap = left.durationFrom() <= right.durationTo()
                        && right.durationFrom() <= left.durationTo();
                boolean datesOverlap = !left.effectiveFrom().isAfter(
                        right.effectiveTo() == null ? LocalDate.MAX : right.effectiveTo())
                        && !right.effectiveFrom().isAfter(
                                left.effectiveTo() == null ? LocalDate.MAX : left.effectiveTo());
                if (sameUnit && amountOverlap && termOverlap && datesOverlap) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Rate matrix bands must not overlap for the same duration unit and effective dates");
                }
            }
        }
    }

    private void validateRequestedTerm(Long productId, LocalDate date, int duration, DurationUnit durationUnit) {
        List<ProductCharacteristic> values = characteristics.findAllByProductProductId(productId);
        BigDecimal minMonths = valueAt(values, TERM_MIN_MONTHS, date);
        BigDecimal maxMonths = valueAt(values, TERM_MAX_MONTHS, date);
        if (minMonths == null || maxMonths == null) return;

        // Product term limits are stored in months. Treat a month as 30 days
        // when callers quote a day-based rate-matrix band.
        BigDecimal requestedMonths = switch (durationUnit) {
            case DAYS -> BigDecimal.valueOf(duration).divide(BigDecimal.valueOf(30), 8,
                    java.math.RoundingMode.HALF_UP);
            case MONTHS -> BigDecimal.valueOf(duration);
            case YEARS -> BigDecimal.valueOf(duration).multiply(BigDecimal.valueOf(12));
        };
        if (requestedMonths.compareTo(minMonths) < 0 || requestedMonths.compareTo(maxMonths) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Requested term is outside the product's configured termLimit");
        }
    }

    private BigDecimal valueAt(List<ProductCharacteristic> values, String name, LocalDate date) {
        return values.stream()
                .filter(c -> matchesCharacteristic(c.getCharacteristicName(), name))
                .filter(c -> !c.getEffectiveFrom().isAfter(date))
                .filter(c -> c.getEffectiveTo() == null || !c.getEffectiveTo().isBefore(date))
                .findFirst()
                .map(c -> c.getDataType() == CharacteristicDataType.PERCENTAGE
                        ? c.getValuePercentage() : c.getValueNumber())
                .orElse(null);
    }

    private String normalizeCurrency(String currency) {
        String normalized = currency == null || currency.isBlank() ? "INR" : currency.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) throw new ApiException(HttpStatus.BAD_REQUEST, "currency must be a three-letter ISO code");
        return normalized;
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
