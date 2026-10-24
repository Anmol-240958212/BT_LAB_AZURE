package com.bankingtech.product;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.bankingtech.product.controller.HealthController;
import com.bankingtech.product.controller.ProductController;
import com.bankingtech.product.dto.EffectiveRateResponseDto;
import com.bankingtech.product.dto.ProductPenaltyResponseDto;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.dto.ProductSummaryReportDto;
import com.bankingtech.product.dto.ProductValidationResponseDto;
import com.bankingtech.product.dto.RateLimitDto;
import com.bankingtech.product.dto.TermLimitDto;
import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.RateType;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.exception.ApiExceptionHandler;
import com.bankingtech.product.service.CategoryPricingService;
import com.bankingtech.product.service.ProductService;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    private MockMvc mockMvc;

    @Mock private ProductService productService;
    @Mock private CategoryPricingService categoryPricingService;

    @BeforeEach
    void setUp() {
        ProductController productController = new ProductController(productService, categoryPricingService);
        HealthController healthController = new HealthController();
        mockMvc = MockMvcBuilders.standaloneSetup(productController, healthController)
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Lab L23: GET /api/health returns UP status and 200 OK")
    void healthCheck_returnsOk() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("product-pricing-service"));
    }

    @Test
    @DisplayName("Lab L13: GET /api/product/{code}/validate returns product validation response")
    void validateProduct_returnsOk() throws Exception {
        ProductValidationResponseDto response = new ProductValidationResponseDto(
                true, "FD001", "Standard FD", "FD", RecordStatus.ACTIVE,
                12, new TermLimitDto(3, 36), BigDecimal.valueOf(100000), "INR",
                BigDecimal.valueOf(6.5), RateType.COMPOUND, Frequency.QUARTERLY,
                "Product parameters are valid");

        when(productService.validateProductForAccount(eq("FD001"), eq(12), any(), eq("INR")))
                .thenReturn(response);

        mockMvc.perform(get("/api/product/FD001/validate")
                        .param("termMonths", "12")
                        .param("amount", "100000")
                        .param("currency", "INR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.productCode").value("FD001"))
                .andExpect(jsonPath("$.applicableRate").value(6.5));
    }

    @Test
    @DisplayName("Lab L15: GET /api/product/{code}/penalty returns penalty configuration")
    void getPenalty_returnsOk() throws Exception {
        ProductPenaltyResponseDto response = new ProductPenaltyResponseDto(
                "FD001", "Standard FD", RecordStatus.ACTIVE,
                BigDecimal.valueOf(1.0), BigDecimal.valueOf(200.0), "INR", "Standard early closure penalty");

        when(productService.getPenaltyDetails("FD001")).thenReturn(response);

        mockMvc.perform(get("/api/product/FD001/penalty"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCode").value("FD001"))
                .andExpect(jsonPath("$.penaltyPercent").value(1.0))
                .andExpect(jsonPath("$.flatFee").value(200.0));
    }

    @Test
    @DisplayName("Lab L21: GET /api/product/report/summary returns aggregated report")
    void getSummaryReport_returnsOk() throws Exception {
        ProductSummaryReportDto summary = new ProductSummaryReportDto(
                10, 8, 2, java.util.Map.of("FD", 5L, "SB", 3L),
                BigDecimal.valueOf(5.0), BigDecimal.valueOf(8.5), BigDecimal.valueOf(6.75));

        when(productService.getSummaryReport()).thenReturn(summary);

        mockMvc.perform(get("/api/product/report/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts").value(10))
                .andExpect(jsonPath("$.activeProducts").value(8));
    }

    @Test
    @DisplayName("Lab L6 & L10: GET /api/product/{code}/effective-rate returns calculated quote")
    void getEffectiveRate_returnsQuote() throws Exception {
        EffectiveRateResponseDto quote = new EffectiveRateResponseDto(
                "FD001", BigDecimal.valueOf(6.5), BigDecimal.valueOf(2.0),
                BigDecimal.valueOf(8.5), BigDecimal.valueOf(8.5), BigDecimal.valueOf(2.0),
                true, List.of("SENIOR_CITIZEN", "EMPLOYEE"));

        when(categoryPricingService.effectiveRate(eq("FD001"), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(quote);

        mockMvc.perform(get("/api/product/FD001/effective-rate")
                        .param("principal", "100000")
                        .param("term", "12")
                        .param("categories", "SENIOR_CITIZEN", "EMPLOYEE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCode").value("FD001"))
                .andExpect(jsonPath("$.effectiveRate").value(8.5))
                .andExpect(jsonPath("$.capped").value(true));
    }
}
