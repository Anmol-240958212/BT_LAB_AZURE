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

import com.bankingtech.product.dto.ProductCreateRequestDto;
import com.bankingtech.product.dto.ProductPenaltyResponseDto;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.dto.ProductSummaryReportDto;
import com.bankingtech.product.dto.ProductValidationResponseDto;
import com.bankingtech.product.dto.RateLimitDto;
import com.bankingtech.product.dto.ProductUpdateRequestDto;
import com.bankingtech.product.dto.RateMatrixRequestDto;
import com.bankingtech.product.dto.TermLimitDto;
import com.bankingtech.product.entity.Charge;
import com.bankingtech.product.entity.InterestRate;
import com.bankingtech.product.entity.Product;
import com.bankingtech.product.entity.ProductCharacteristic;
import com.bankingtech.product.entity.ProductCharge;
import com.bankingtech.product.entity.ProductPricing;
import com.bankingtech.product.entity.ProductTypeMaster;
import com.bankingtech.product.entity.enums.ChargeType;
import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.PricingType;
import com.bankingtech.product.entity.enums.RateType;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.entity.enums.DurationUnit;
import com.bankingtech.product.exception.ApiException;
import com.bankingtech.product.repository.ChargeRepository;
import com.bankingtech.product.repository.InterestRateRepository;
import com.bankingtech.product.repository.ProductCharacteristicRepository;
import com.bankingtech.product.repository.ProductPricingRepository;
import com.bankingtech.product.repository.ProductRepository;
import com.bankingtech.product.repository.ProductTypeMasterRepository;
import com.bankingtech.product.repository.RateMatrixRepository;
import com.bankingtech.product.service.ProductAuditService;
import com.bankingtech.product.service.ProductService;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock private ProductRepository productRepo;
    @Mock private ProductTypeMasterRepository typeRepo;
    @Mock private ProductCharacteristicRepository charRepo;
    @Mock private ProductPricingRepository pricingRepo;
    @Mock private InterestRateRepository rateRepo;
    @Mock private ChargeRepository chargeRepo;
    @Mock private ProductAuditService auditService;
    @Mock private RateMatrixRepository rateMatrixRepo;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(
                productRepo, typeRepo, charRepo, pricingRepo,
                rateRepo, chargeRepo, auditService, rateMatrixRepo);
    }

    private Product createSampleFDProduct(String code, RecordStatus status) {
        ProductTypeMaster type = new ProductTypeMaster();
        type.setTypeCode("FD");
        type.setTypeName("Fixed Deposit");

        Product product = new Product();
        product.setProductId(1L);
        product.setProductCode(code);
        product.setProductName("Standard Fixed Deposit");
        product.setProductType(type);
        product.setCurrencyCode("INR");
        product.setEffectiveFrom(LocalDate.now().minusMonths(1));
        product.setStatus(status);

        ProductCharacteristic minTerm = ProductCharacteristic.ofNumber(
                ProductService.TERM_MIN_MONTHS, BigDecimal.valueOf(3), LocalDate.now().minusMonths(1));
        ProductCharacteristic maxTerm = ProductCharacteristic.ofNumber(
                ProductService.TERM_MAX_MONTHS, BigDecimal.valueOf(36), LocalDate.now().minusMonths(1));
        product.addCharacteristic(minTerm);
        product.addCharacteristic(maxTerm);

        ProductPricing pricing = new ProductPricing(PricingType.STANDARD, LocalDate.now().minusMonths(1));
        pricing.setStatus(RecordStatus.ACTIVE);
        InterestRate rate = new InterestRate(BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY, LocalDate.now().minusMonths(1));
        pricing.addInterestRate(rate);
        product.addPricing(pricing);

        return product;
    }

    @Test
    @DisplayName("Create product rejects duplicate productCode with 409 Conflict")
    void createProduct_rejectsDuplicate() {
        ProductCreateRequestDto req = new ProductCreateRequestDto(
                "FD001", "Fixed Deposit", "FD", "INR", "Desc",
                LocalDate.now(), null,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5.0), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY,
                null, List.of("OWNER"), List.of("DEPOSIT"), BigDecimal.valueOf(2.0), null);

        when(productRepo.existsByProductCodeIgnoreCase("FD001")).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> productService.create(req, "admin"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @DisplayName("Update retains omitted values and clears explicitly-null description and end date")
    void update_tracksExplicitNullForNullableFields() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        product.setDescription("Existing description");
        product.setEffectiveTo(LocalDate.of(2027, 12, 31));
        product.getPricings().get(0).setEffectiveTo(LocalDate.of(2029, 12, 31));
        product.getPricings().get(0).getInterestRates().get(0).setEffectiveTo(LocalDate.of(2029, 12, 31));
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());
        when(productRepo.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductUpdateRequestDto keepValues = new ProductUpdateRequestDto();
        keepValues.setProductName("Renamed product");
        productService.update("FD001", keepValues, "officer");
        assertEquals("Existing description", product.getDescription());
        assertEquals(LocalDate.of(2027, 12, 31), product.getEffectiveTo());

        ProductUpdateRequestDto shortenProductOnly = new ProductUpdateRequestDto();
        shortenProductOnly.setEffectiveTo(LocalDate.of(2027, 6, 30));
        productService.update("FD001", shortenProductOnly, "officer");
        assertEquals(LocalDate.of(2027, 6, 30), product.getEffectiveTo());
        assertEquals(LocalDate.of(2029, 12, 31), product.getPricings().get(0).getEffectiveTo());
        assertEquals(LocalDate.of(2029, 12, 31),
                product.getPricings().get(0).getInterestRates().get(0).getEffectiveTo());

        ProductUpdateRequestDto clearNullable = new ProductUpdateRequestDto();
        clearNullable.setDescription(null);
        clearNullable.setEffectiveTo(null);
        productService.update("FD001", clearNullable, "officer");
        assertNull(product.getDescription());
        assertNull(product.getEffectiveTo());
    }

    @Test
    @DisplayName("Product can be deactivated and reactivated through status maintenance")
    void update_canDeactivateAndReactivateProduct() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());
        when(productRepo.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductUpdateRequestDto deactivate = new ProductUpdateRequestDto();
        deactivate.setStatus(RecordStatus.INACTIVE);
        ProductResponseDto inactive = productService.update("FD001", deactivate, "officer");
        assertEquals(RecordStatus.INACTIVE, inactive.status());

        ProductUpdateRequestDto reactivate = new ProductUpdateRequestDto();
        reactivate.setStatus(RecordStatus.ACTIVE);
        ProductResponseDto active = productService.update("FD001", reactivate, "officer");
        assertEquals(RecordStatus.ACTIVE, active.status());
    }

    @Test
    @DisplayName("Create rejects an inverted rate-matrix amount range before persistence")
    void create_rejectsInvalidRateMatrixAmountRange() {
        ProductCreateRequestDto req = new ProductCreateRequestDto(
                "FD009", "Fixed Deposit", "FD", "INR", null,
                LocalDate.now(), null,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY,
                null, null, null, null,
                List.of(new RateMatrixRequestDto(BigDecimal.valueOf(1000), BigDecimal.valueOf(100),
                        6, 12, DurationUnit.MONTHS, BigDecimal.valueOf(6), LocalDate.now(), null)));
        when(productRepo.existsByProductCodeIgnoreCase("FD009")).thenReturn(false);
        ProductTypeMaster type = new ProductTypeMaster();
        type.setTypeCode("FD");
        type.setTypeName("Fixed Deposit");
        when(typeRepo.findByTypeCodeIgnoreCase("FD")).thenReturn(Optional.of(type));

        ApiException error = assertThrows(ApiException.class, () -> productService.create(req, "officer"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(productRepo, never()).save(any());
    }

    @Test
    @DisplayName("Create rejects an inverted rate-matrix tenure range before persistence")
    void create_rejectsInvalidRateMatrixTenureRange() {
        ProductCreateRequestDto req = new ProductCreateRequestDto(
                "FD009", "Fixed Deposit", "FD", "INR", null,
                LocalDate.now(), null,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY,
                null, null, null, null,
                List.of(new RateMatrixRequestDto(BigDecimal.valueOf(100), BigDecimal.valueOf(1000),
                        12, 6, DurationUnit.MONTHS, BigDecimal.valueOf(6), LocalDate.now(), null)));
        when(productRepo.existsByProductCodeIgnoreCase("FD009")).thenReturn(false);
        ProductTypeMaster type = new ProductTypeMaster();
        type.setTypeCode("FD");
        type.setTypeName("Fixed Deposit");
        when(typeRepo.findByTypeCodeIgnoreCase("FD")).thenReturn(Optional.of(type));

        ApiException error = assertThrows(ApiException.class, () -> productService.create(req, "officer"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertTrue(error.getMessage().contains("duration bands"));
        verify(productRepo, never()).save(any());
    }

    @Test
    @DisplayName("Create rejects rate-matrix effective end before its start")
    void create_rejectsInvalidRateMatrixEffectiveDates() {
        LocalDate start = LocalDate.of(2027, 1, 1);
        ProductCreateRequestDto req = new ProductCreateRequestDto(
                "FD009", "Fixed Deposit", "FD", "INR", null,
                start, null,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY,
                null, null, null, null,
                List.of(new RateMatrixRequestDto(BigDecimal.valueOf(100), BigDecimal.valueOf(1000),
                        6, 12, DurationUnit.MONTHS, BigDecimal.valueOf(6), start, start.minusDays(1))));
        when(productRepo.existsByProductCodeIgnoreCase("FD009")).thenReturn(false);
        ProductTypeMaster type = new ProductTypeMaster();
        type.setTypeCode("FD");
        type.setTypeName("Fixed Deposit");
        when(typeRepo.findByTypeCodeIgnoreCase("FD")).thenReturn(Optional.of(type));

        ApiException error = assertThrows(ApiException.class, () -> productService.create(req, "officer"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertTrue(error.getMessage().contains("effectiveTo"));
        verify(productRepo, never()).save(any());
    }

    @Test
    @DisplayName("Create rejects rate-matrix bands overlapping in amount, tenure, and effective dates")
    void create_rejectsOverlappingRateMatrixBands() {
        LocalDate start = LocalDate.of(2027, 1, 1);
        ProductCreateRequestDto req = new ProductCreateRequestDto(
                "FD010", "Fixed Deposit", "FD", "INR", null, start, null,
                new TermLimitDto(3, 36),
                new RateLimitDto(BigDecimal.valueOf(5), BigDecimal.valueOf(8.5)),
                BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY,
                null, null, null, null,
                List.of(
                        new RateMatrixRequestDto(BigDecimal.valueOf(100), BigDecimal.valueOf(1000),
                                6, 12, DurationUnit.MONTHS, BigDecimal.valueOf(6), start, null),
                        new RateMatrixRequestDto(BigDecimal.valueOf(500), BigDecimal.valueOf(1500),
                                10, 18, DurationUnit.MONTHS, BigDecimal.valueOf(7), start.plusMonths(1), null)));
        when(productRepo.existsByProductCodeIgnoreCase("FD010")).thenReturn(false);
        ProductTypeMaster type = new ProductTypeMaster();
        type.setTypeCode("FD");
        type.setTypeName("Fixed Deposit");
        when(typeRepo.findByTypeCodeIgnoreCase("FD")).thenReturn(Optional.of(type));

        ApiException error = assertThrows(ApiException.class, () -> productService.create(req, "officer"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertTrue(error.getMessage().contains("must not overlap"));
        verify(productRepo, never()).save(any());
    }

    @Test
    @DisplayName("Lab L13: Validate product returns valid=true when term and currency match")
    void validateProduct_success() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());
        when(pricingRepo.findAllByProductProductIdAndStatusAndEffectiveFromLessThanEqual(eq(1L), eq(RecordStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(product.getPricings());
        when(rateRepo.findAllByPricingPricingIdAndEffectiveFromLessThanEqual(any(), any(LocalDate.class)))
                .thenReturn(product.getPricings().get(0).getInterestRates());

        ProductValidationResponseDto result = productService.validateProductForAccount(
                "FD001", 12, BigDecimal.valueOf(100000), "INR");

        assertTrue(result.valid());
        assertEquals("FD001", result.productCode());
        assertEquals(RecordStatus.ACTIVE, result.status());
        assertEquals(12, result.termMonths());
        assertEquals(BigDecimal.valueOf(6.5), result.applicableRate());
    }

    @Test
    @DisplayName("Lab L13: Validate product returns valid=false when term is out of bounds")
    void validateProduct_invalidTerm() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());

        ProductValidationResponseDto result = productService.validateProductForAccount(
                "FD001", 48, BigDecimal.valueOf(100000), "INR"); // 48 > max 36

        assertFalse(result.valid());
        assertTrue(result.message().contains("outside allowed range"));
    }

    @Test
    @DisplayName("Lab L15: Get penalty details returns configured or default penalty percentage")
    void getPenaltyDetails_returnsPenalty() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);

        Charge penaltyCharge = new Charge();
        penaltyCharge.setChargeCode("PREMAT_PENALTY");
        penaltyCharge.setChargeType(ChargeType.PENALTY);
        ProductCharge pc = ProductCharge.percentage(penaltyCharge, BigDecimal.valueOf(1.5), null, LocalDate.now());
        pc.setStatus(RecordStatus.ACTIVE);
        product.addCharge(pc);

        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));

        ProductPenaltyResponseDto penalty = productService.getPenaltyDetails("FD001");
        assertNotNull(penalty);
        assertEquals("FD001", penalty.productCode());
        assertEquals(BigDecimal.valueOf(1.5), penalty.penaltyPercent());
    }

    @Test
    void validateProduct_rejectsNonpositiveOrMissingAmountAndTerm() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());
        for (BigDecimal amount : java.util.Arrays.asList(null, BigDecimal.ZERO, BigDecimal.valueOf(-1))) {
            var result = productService.validateProductForAccount("FD001", 12, amount, "INR");
            assertFalse(result.valid());
            assertNull(result.applicableRate());
            assertTrue(result.message().contains("Amount must be greater than zero"));
        }
        for (Integer term : java.util.Arrays.asList(null, 0, -1)) {
            assertFalse(productService.validateProductForAccount("FD001", term, BigDecimal.TEN, "INR").valid());
        }
        verifyNoInteractions(pricingRepo);
    }

    @Test
    void validateProduct_rejectsMissingRate() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());
        var result = productService.validateProductForAccount("FD001", 12, BigDecimal.TEN, "INR");
        assertFalse(result.valid());
        assertNull(result.applicableRate());
        assertTrue(result.message().contains("No applicable rate"));
    }

    @Test
    void validateProductUsesConfiguredTypeAndFrequency() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        product.addCharacteristic(ProductCharacteristic.ofText("INTEREST_TYPE", "SIMPLE", LocalDate.now()));
        product.addCharacteristic(ProductCharacteristic.ofText("INTEREST_FREQUENCY", "ANNUALLY", LocalDate.now()));
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        when(charRepo.findAllByProductProductId(1L)).thenReturn(product.getCharacteristics());
        when(pricingRepo.findAllByProductProductIdAndStatusAndEffectiveFromLessThanEqual(eq(1L), eq(RecordStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(product.getPricings());
        when(rateRepo.findAllByPricingPricingIdAndEffectiveFromLessThanEqual(any(), any(LocalDate.class)))
                .thenReturn(product.getPricings().get(0).getInterestRates());
        var result = productService.validateProductForAccount("FD001", 12, BigDecimal.TEN, "INR");
        assertTrue(result.valid());
        assertEquals(RateType.SIMPLE, result.rateType());
        assertEquals(Frequency.ANNUALLY, result.frequency());
    }

    @Test
    void penalty_doesNotInventADefaultOrUseFutureCharges() {
        Product product = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        Charge charge = new Charge();
        charge.setChargeCode("PREMAT_PENALTY");
        charge.setChargeType(ChargeType.PENALTY);
        product.addCharge(ProductCharge.percentage(charge, BigDecimal.ONE, null, LocalDate.now().plusDays(1)));
        when(productRepo.findByProductCodeIgnoreCase("FD001")).thenReturn(Optional.of(product));
        var result = productService.getPenaltyDetails("FD001");
        assertNull(result.penaltyPercent());
        assertTrue(result.remarks().contains("No premature withdrawal penalty"));
    }

    @Test
    @DisplayName("Lab L21: Get operational summary report aggregates products by type and rates")
    void getSummaryReport_aggregatesCorrectly() {
        Product fd = createSampleFDProduct("FD001", RecordStatus.ACTIVE);
        when(productRepo.findAll()).thenReturn(List.of(fd));
        when(pricingRepo.findAllByProductProductIdAndStatusAndEffectiveFromLessThanEqual(eq(1L), eq(RecordStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(fd.getPricings());
        when(rateRepo.findAllByPricingPricingIdAndEffectiveFromLessThanEqual(any(), any(LocalDate.class)))
                .thenReturn(fd.getPricings().get(0).getInterestRates());

        ProductSummaryReportDto summary = productService.getSummaryReport();
        assertEquals(1, summary.totalProducts());
        assertEquals(1, summary.activeProducts());
        assertEquals(0, summary.inactiveProducts());
        assertEquals(0, BigDecimal.valueOf(6.5).compareTo(summary.averageBaseRate()));
    }
}
