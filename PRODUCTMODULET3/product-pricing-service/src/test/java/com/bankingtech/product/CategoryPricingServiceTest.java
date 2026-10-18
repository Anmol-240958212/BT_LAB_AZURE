package com.bankingtech.product;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import com.bankingtech.product.dto.EffectiveRateResponseDto;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.dto.CategoryRateRequestDto;
import com.bankingtech.product.dto.RateLimitDto;
import com.bankingtech.product.dto.TermLimitDto;
import com.bankingtech.product.entity.Product;
import com.bankingtech.product.entity.ProductCharacteristic;
import com.bankingtech.product.entity.ProductRule;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.exception.ApiException;
import com.bankingtech.product.repository.ProductCharacteristicRepository;
import com.bankingtech.product.repository.ProductRepository;
import com.bankingtech.product.repository.ProductRuleRepository;
import com.bankingtech.product.service.CategoryPricingService;
import com.bankingtech.product.service.ProductAuditService;
import com.bankingtech.product.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class CategoryPricingServiceTest {

    @Mock private ProductRepository productRepo;
    @Mock private ProductRuleRepository ruleRepo;
    @Mock private ProductService productService;
    @Mock private ProductAuditService auditService;
    @Mock private ProductCharacteristicRepository charRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private CategoryPricingService categoryPricingService;

    @BeforeEach
    void setUp() {
        categoryPricingService = new CategoryPricingService(
                productRepo, ruleRepo, productService, objectMapper, auditService, charRepo);
    }

    private ProductRule createRule(String code, String name, double adjustment, Integer minAge) {
        String jsonDef = "{\"categoryCode\":\"" + code + "\",\"displayName\":\"" + name + "\",\"adjustmentPercent\":" + adjustment
                + (minAge != null ? ",\"minAge\":" + minAge : "") + "}";
        ProductRule rule = new ProductRule(code, name, ProductRule.TYPE_CATEGORY_PRICING, jsonDef, LocalDate.now().minusMonths(1));
        rule.setStatus(RecordStatus.ACTIVE);
        return rule;
    }

    private void stubQuoteContext(List<ProductRule> availableRules, BigDecimal baseRate,
                                  BigDecimal rateCeiling, BigDecimal additionalCap,
                                  LocalDate capEffectiveFrom) {
        Product product = new Product();
        product.setProductId(1L);
        product.setProductCode("FD001");
        product.setStatus(RecordStatus.ACTIVE);
        product.setEffectiveFrom(LocalDate.of(2020, 1, 1));
        ProductResponseDto productDto = new ProductResponseDto(
                "FD001", "Fixed Deposit", "FD", "Fixed Deposit", "INR", "Desc",
                LocalDate.of(2020, 1, 1), null, RecordStatus.ACTIVE,
                new TermLimitDto(1, 120),
                new RateLimitDto(BigDecimal.ZERO, rateCeiling),
                baseRate, additionalCap, List.of(), List.of("OWNER"), List.of("DEPOSIT"), List.of());

        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(productService.get("FD001")).thenReturn(productDto);
        when(productService.findBaseRate(eq("FD001"), any(), any(), any(), any())).thenReturn(baseRate);
        when(ruleRepo.findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
                eq(1L), eq(ProductRule.TYPE_CATEGORY_PRICING), eq(RecordStatus.ACTIVE), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate at = invocation.getArgument(3);
                    return availableRules.stream().filter(rule -> !rule.getEffectiveFrom().isAfter(at)).toList();
                });
        if (additionalCap != null) {
            lenient().when(charRepo.findByProductProductIdAndCharacteristicNameIgnoreCase(
                    eq(1L), eq(ProductService.CATEGORY_RATE_CAP)))
                    .thenReturn(Optional.of(ProductCharacteristic.ofPercentage(
                            ProductService.CATEGORY_RATE_CAP, additionalCap, capEffectiveFrom)));
        } else {
            lenient().when(charRepo.findByProductProductIdAndCharacteristicNameIgnoreCase(
                    eq(1L), eq(ProductService.CATEGORY_RATE_CAP))).thenReturn(Optional.empty());
        }
    }

    @Test
    @DisplayName("Lab L6 & L10: Effective rate computes category add-on and honors additional rate cap")
    void effectiveRate_appliesCapping() {
        Product product = new Product();
        product.setProductId(1L);
        product.setProductCode("FD001");
        product.setStatus(RecordStatus.ACTIVE);
        product.setEffectiveFrom(LocalDate.now().minusMonths(1));

        ProductResponseDto productDto = new ProductResponseDto(
                "FD001", "Fixed Deposit", "FD", "Fixed Deposit", "INR", "Desc",
                LocalDate.now().minusMonths(1), null, RecordStatus.ACTIVE,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5.0), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), BigDecimal.valueOf(2.0),
                List.of(), List.of("OWNER"), List.of("DEPOSIT"), List.of());

        ProductRule seniorRule = createRule("SENIOR_CITIZEN", "Senior Citizen", 1.0, 60);
        ProductRule empRule = createRule("EMPLOYEE", "Bank Employee", 1.5, null);

        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(productService.get("FD001")).thenReturn(productDto);
        when(productService.findBaseRate(eq("FD001"), any(), any(), any(), any())).thenReturn(BigDecimal.valueOf(6.5));
        when(ruleRepo.findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
                eq(1L), eq(ProductRule.TYPE_CATEGORY_PRICING), eq(RecordStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(List.of(seniorRule, empRule));

        // Combined add-on: 1.0 + 1.5 = 2.5%, but additional rate cap is 2.0%
        // Base rate = 6.5%, effective rate = min(6.5 + 2.0, 8.5) = 8.5%
        ProductCharacteristic capChar = ProductCharacteristic.ofPercentage(
                ProductService.CATEGORY_RATE_CAP, BigDecimal.valueOf(2.0), LocalDate.now().minusMonths(1));
        when(charRepo.findByProductProductIdAndCharacteristicNameIgnoreCase(eq(1L), eq(ProductService.CATEGORY_RATE_CAP)))
                .thenReturn(Optional.of(capChar));

        EffectiveRateResponseDto quote = categoryPricingService.effectiveRate(
                "FD001", List.of("SENIOR_CITIZEN", "EMPLOYEE"), 65, null, LocalDate.now(), null, null, null);

        assertNotNull(quote);
        assertEquals(BigDecimal.valueOf(6.5).setScale(4), quote.baseRate());
        assertEquals(BigDecimal.valueOf(2.0).setScale(4), quote.totalAdjustmentPercent());
        assertEquals(BigDecimal.valueOf(8.5).setScale(4), quote.effectiveRate());
        assertTrue(quote.capped());
        assertEquals(2, quote.appliedCategories().size());
    }

    @Test
    @DisplayName("Age-qualified category rejects customer when age requirement is not met")
    void effectiveRate_rejectsUnderageCustomer() {
        Product product = new Product();
        product.setProductId(1L);
        product.setProductCode("FD001");
        product.setStatus(RecordStatus.ACTIVE);
        product.setEffectiveFrom(LocalDate.now().minusMonths(1));

        ProductResponseDto productDto = new ProductResponseDto(
                "FD001", "Fixed Deposit", "FD", "Fixed Deposit", "INR", "Desc",
                LocalDate.now().minusMonths(1), null, RecordStatus.ACTIVE,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5.0), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), BigDecimal.valueOf(2.0),
                List.of(), List.of("OWNER"), List.of("DEPOSIT"), List.of());

        ProductRule seniorRule = createRule("SENIOR_CITIZEN", "Senior Citizen", 1.0, 60);

        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(productService.get("FD001")).thenReturn(productDto);
        when(productService.findBaseRate(eq("FD001"), any(), any(), any(), any())).thenReturn(BigDecimal.valueOf(6.5));
        when(ruleRepo.findAllByProductProductIdAndRuleTypeAndStatusAndEffectiveFromLessThanEqual(
                eq(1L), eq(ProductRule.TYPE_CATEGORY_PRICING), eq(RecordStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(List.of(seniorRule));

        ApiException ex = assertThrows(ApiException.class, () ->
                categoryPricingService.effectiveRate(
                        "FD001", List.of("SENIOR_CITIZEN"), 45, null, LocalDate.now(), null, null, null)); // 45 < 60

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("does not meet age criteria"));
    }

    @Test
    @DisplayName("Selected age and gender qualified category applies at its inclusive end date")
    void effectiveRate_appliesQualifiedCategoryAtInclusiveEndDate() {
        LocalDate from = LocalDate.of(2026, 10, 17);
        LocalDate through = LocalDate.of(2027, 10, 17);
        ProductRule senior = new ProductRule("SENIOR_CITIZEN", "Senior Citizen",
                ProductRule.TYPE_CATEGORY_PRICING,
                "{\"categoryCode\":\"SENIOR_CITIZEN\",\"adjustmentPercent\":1.5,\"minAge\":60,\"maxAge\":100,\"gender\":\"X\"}", from);
        senior.setEffectiveTo(through);
        senior.setStatus(RecordStatus.ACTIVE);
        stubQuoteContext(List.of(senior), BigDecimal.valueOf(7), BigDecimal.valueOf(15),
                BigDecimal.valueOf(2), from);

        EffectiveRateResponseDto quote = categoryPricingService.effectiveRate("FD001",
                List.of("SENIOR_CITIZEN"), 60, "X", through, null, null, null);

        assertEquals(BigDecimal.valueOf(1.5).setScale(4), quote.totalAdjustmentPercent());
        assertEquals(BigDecimal.valueOf(8.5).setScale(4), quote.effectiveRate());
        assertEquals(BigDecimal.valueOf(15).setScale(4), quote.rateCap());
        assertEquals(BigDecimal.valueOf(2).setScale(4), quote.additionalRateCap());
        assertFalse(quote.capped());
        assertEquals(List.of("SENIOR_CITIZEN"), quote.appliedCategories());
    }

    @Test
    @DisplayName("Expired category version is not applicable after its inclusive end date")
    void effectiveRate_rejectsCategoryAfterEffectiveTo() {
        LocalDate from = LocalDate.of(2026, 10, 17);
        LocalDate through = LocalDate.of(2027, 10, 17);
        ProductRule senior = new ProductRule("SENIOR_CITIZEN", "Senior Citizen",
                ProductRule.TYPE_CATEGORY_PRICING,
                "{\"categoryCode\":\"SENIOR_CITIZEN\",\"adjustmentPercent\":1.5}", from);
        senior.setEffectiveTo(through);
        senior.setStatus(RecordStatus.ACTIVE);
        stubQuoteContext(List.of(senior), BigDecimal.valueOf(7), BigDecimal.valueOf(15),
                BigDecimal.valueOf(2), from);

        ApiException error = assertThrows(ApiException.class, () -> categoryPricingService.effectiveRate("FD001",
                List.of("SENIOR_CITIZEN"), null, null, through.plusDays(1), null, null, null));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertTrue(error.getMessage().contains("Unknown or inactive category"));
    }

    @Test
    @DisplayName("Category adjustments are opt-in through the requested categories parameter")
    void effectiveRate_doesNotApplyUnselectedCategory() {
        ProductRule senior = createRule("SENIOR_CITIZEN", "Senior Citizen", 1.5, 60);
        stubQuoteContext(List.of(senior), BigDecimal.valueOf(7), BigDecimal.valueOf(15),
                BigDecimal.valueOf(2), LocalDate.now().minusDays(1));

        EffectiveRateResponseDto quote = categoryPricingService.effectiveRate("FD001",
                List.of(), null, null, LocalDate.now(), null, null, null);

        assertEquals(BigDecimal.ZERO.setScale(4), quote.totalAdjustmentPercent());
        assertEquals(BigDecimal.valueOf(7).setScale(4), quote.effectiveRate());
        assertTrue(quote.appliedCategories().isEmpty());
    }

    @Test
    @DisplayName("Effective quote rejects pre-existing overlapping active versions instead of choosing arbitrarily")
    void effectiveRate_rejectsAmbiguousActiveVersions() {
        ProductRule first = createRule("SENIOR_CITIZEN", "Senior Citizen", 1.0, null);
        first.setEffectiveFrom(LocalDate.of(2026, 1, 1));
        first.setEffectiveTo(LocalDate.of(2027, 12, 31));
        ProductRule second = createRule("SENIOR_CITIZEN", "Senior Citizen revised", 1.5, null);
        second.setEffectiveFrom(LocalDate.of(2027, 1, 1));
        stubQuoteContext(List.of(first, second), BigDecimal.valueOf(7), BigDecimal.valueOf(15),
                BigDecimal.valueOf(2), LocalDate.of(2026, 1, 1));

        ApiException error = assertThrows(ApiException.class, () -> categoryPricingService.effectiveRate(
                "FD001", List.of("SENIOR_CITIZEN"), null, null,
                LocalDate.of(2027, 6, 1), null, null, null));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertTrue(error.getMessage().contains("Multiple active category rate versions"));
    }

    @Test
    @DisplayName("Gender-qualified category requires an exact supplied gender")
    void effectiveRate_rejectsNonMatchingGender() {
        ProductRule senior = new ProductRule("SENIOR_CITIZEN", "Senior Citizen",
                ProductRule.TYPE_CATEGORY_PRICING,
                "{\"categoryCode\":\"SENIOR_CITIZEN\",\"adjustmentPercent\":1.5,\"gender\":\"X\"}",
                LocalDate.of(2026, 10, 17));
        senior.setStatus(RecordStatus.ACTIVE);
        stubQuoteContext(List.of(senior), BigDecimal.valueOf(7), BigDecimal.valueOf(15),
                BigDecimal.valueOf(2), LocalDate.of(2026, 10, 17));

        ApiException error = assertThrows(ApiException.class, () -> categoryPricingService.effectiveRate(
                "FD001", List.of("SENIOR_CITIZEN"), null, "F",
                LocalDate.of(2026, 10, 17), null, null, null));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertTrue(error.getMessage().contains("gender criteria"));
    }

    @Test
    @DisplayName("Category rate can be revised in a non-overlapping future interval")
    void add_allowsFutureVersion() {
        Product product = new Product();
        product.setProductId(7L);
        product.setProductCode("FD007");
        ProductRule prior = createRule("SENIOR", "Senior", 1.0, 60);
        prior.setEffectiveFrom(LocalDate.of(2026, 1, 1));
        prior.setEffectiveTo(LocalDate.of(2026, 12, 31));
        when(productRepo.findByProductCodeIgnoreCaseForUpdate("FD007")).thenReturn(Optional.of(product));
        when(ruleRepo.findAllByProductProductIdAndRuleType(7L, ProductRule.TYPE_CATEGORY_PRICING))
                .thenReturn(List.of(prior));
        when(ruleRepo.save(any(ProductRule.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CategoryRateRequestDto future = new CategoryRateRequestDto("SENIOR", "Senior revised",
                BigDecimal.valueOf(1.25), 60, null, null,
                LocalDate.of(2027, 1, 1), null);

        var created = categoryPricingService.add("FD007", future, "officer");

        assertEquals("SENIOR", created.categoryCode());
        verify(ruleRepo).save(argThat(rule -> rule.getEffectiveFrom().equals(LocalDate.of(2027, 1, 1))));
    }

    @Test
    @DisplayName("Category rate rejects overlapping version intervals")
    void add_rejectsOverlappingVersion() {
        Product product = new Product();
        product.setProductId(7L);
        product.setProductCode("FD007");
        ProductRule prior = createRule("SENIOR", "Senior", 1.0, 60);
        prior.setEffectiveFrom(LocalDate.of(2026, 1, 1));
        prior.setEffectiveTo(LocalDate.of(2026, 12, 31));
        when(productRepo.findByProductCodeIgnoreCaseForUpdate("FD007")).thenReturn(Optional.of(product));
        when(ruleRepo.findAllByProductProductIdAndRuleType(7L, ProductRule.TYPE_CATEGORY_PRICING))
                .thenReturn(List.of(prior));
        CategoryRateRequestDto overlapping = new CategoryRateRequestDto("SENIOR", "Senior revised",
                BigDecimal.valueOf(1.25), 60, null, null,
                LocalDate.of(2026, 12, 31), null);

        ApiException error = assertThrows(ApiException.class,
                () -> categoryPricingService.add("FD007", overlapping, "officer"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(ruleRepo, never()).save(any());
    }

    @Test
    @DisplayName("Open-ended category rule overlaps every later inclusive date interval")
    void add_rejectsVersionAfterOpenEndedRule() {
        Product product = new Product();
        product.setProductId(7L);
        product.setProductCode("FD007");
        ProductRule openEnded = createRule("SENIOR", "Senior", 1.0, 60);
        openEnded.setEffectiveFrom(LocalDate.of(2026, 1, 1));
        openEnded.setEffectiveTo(null);
        when(productRepo.findByProductCodeIgnoreCaseForUpdate("FD007")).thenReturn(Optional.of(product));
        when(ruleRepo.findAllByProductProductIdAndRuleType(7L, ProductRule.TYPE_CATEGORY_PRICING))
                .thenReturn(List.of(openEnded));
        CategoryRateRequestDto future = new CategoryRateRequestDto("SENIOR", "Senior revised",
                BigDecimal.valueOf(1.25), 60, null, null, LocalDate.of(2030, 1, 1), null);

        ApiException error = assertThrows(ApiException.class,
                () -> categoryPricingService.add("FD007", future, "officer"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(ruleRepo, never()).save(any());
    }

    @Test
    @DisplayName("Category rate rejects an end date before its start date")
    void add_rejectsInvertedEffectiveDates() {
        Product product = new Product();
        product.setProductId(7L);
        product.setProductCode("FD007");
        when(productRepo.findByProductCodeIgnoreCaseForUpdate("FD007")).thenReturn(Optional.of(product));
        CategoryRateRequestDto invalid = new CategoryRateRequestDto("SENIOR", "Senior",
                BigDecimal.ONE, 60, null, null, LocalDate.of(2027, 1, 1), LocalDate.of(2026, 12, 31));

        ApiException error = assertThrows(ApiException.class,
                () -> categoryPricingService.add("FD007", invalid, "officer"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(ruleRepo, never()).save(any());
    }
}
