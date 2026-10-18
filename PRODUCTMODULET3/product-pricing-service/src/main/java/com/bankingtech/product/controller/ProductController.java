package com.bankingtech.product.controller;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.bankingtech.product.dto.CategoryRateRequestDto;
import com.bankingtech.product.dto.CategoryRateResponseDto;
import com.bankingtech.product.dto.EffectiveRateResponseDto;
import com.bankingtech.product.dto.PageResponseDto;
import com.bankingtech.product.dto.ProductCreateRequestDto;
import com.bankingtech.product.dto.ProductPenaltyResponseDto;
import com.bankingtech.product.dto.ProductResponseDto;
import com.bankingtech.product.dto.ProductSummaryReportDto;
import com.bankingtech.product.dto.ProductUpdateRequestDto;
import com.bankingtech.product.dto.ProductValidationResponseDto;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.bankingtech.product.entity.enums.DurationUnit;
import com.bankingtech.product.service.CategoryPricingService;
import com.bankingtech.product.service.ProductService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/product")
@Tag(name = "Products and Pricing", description = "Banking product, base-rate, and category-rate management")
@SecurityRequirement(name = "bearerAuth")
public class ProductController {
    private final ProductService productService;
    private final CategoryPricingService categoryPricingService;

    public ProductController(ProductService productService, CategoryPricingService categoryPricingService) {
        this.productService = productService;
        this.categoryPricingService = categoryPricingService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Create a banking product", description = "Creates product metadata, term/rate limits, optional base rate, and charge associations.")
    public ResponseEntity<ProductResponseDto> create(@Valid @RequestBody ProductCreateRequestDto request,
                                                       Authentication authentication) {
        ProductResponseDto response = productService.create(request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{productCode}")
                .buildAndExpand(response.productCode()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Search products", description = "Filter by product type and effective date range. Results are paginated.")
    public PageResponseDto<ProductResponseDto> search(
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) RecordStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return productService.search(productType, startDate, endDate, status, page, size);
    }

    @GetMapping("/{productCode}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Get a product by code")
    public ProductResponseDto get(@PathVariable String productCode) {
        return productService.get(productCode);
    }

    @PutMapping("/{productCode}")
    @PreAuthorize("hasAnyRole('BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Maintain a product", description = "Updates product name, dates, status, term/rate bounds, and optionally the standard base rate.")
    public ProductResponseDto update(@PathVariable String productCode,
                                     @Valid @RequestBody ProductUpdateRequestDto request,
                                     Authentication authentication) {
        return productService.update(productCode, request, authentication.getName());
    }

    @PostMapping("/{productCode}/category-rates")
    @PreAuthorize("hasAnyRole('BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Add a customer-category rate adjustment")
    public ResponseEntity<CategoryRateResponseDto> addCategoryRate(
            @PathVariable String productCode, @Valid @RequestBody CategoryRateRequestDto request,
            Authentication authentication) {
        return ResponseEntity.status(201).body(categoryPricingService.add(
                productCode, request, authentication.getName()));
    }

    @GetMapping("/{productCode}/category-rates")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "List active category rates")
    public List<CategoryRateResponseDto> listCategoryRates(
            @PathVariable String productCode,
            @RequestParam(required = false) LocalDate date) {
        return categoryPricingService.list(productCode, date);
    }

    @GetMapping("/{productCode}/effective-rate")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Calculate the capped effective rate", description = "Applies each selected category adjustment once and caps the result at the product's configured maximum rate.")
    public EffectiveRateResponseDto effectiveRate(
            @PathVariable String productCode,
            @Parameter(description = "Repeat this query parameter for each category, or provide comma-separated codes")
            @RequestParam(required = false) List<String> categories,
            @RequestParam(required = false) Integer customerAge,
            @RequestParam(required = false) String customerGender,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) java.math.BigDecimal principal,
            @RequestParam(required = false) Integer term,
            @RequestParam(required = false) DurationUnit termUnit) {
        return categoryPricingService.effectiveRate(productCode, categories, customerAge, customerGender,
                date, principal, term, termUnit);
    }

    @GetMapping("/report/summary")
    @PreAuthorize("hasAnyRole('BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Operational product summary report", description = "Aggregated count by type, active/inactive totals, and rate statistics (Lab L21).")
    public ProductSummaryReportDto getSummaryReport() {
        return productService.getSummaryReport();
    }

    @GetMapping("/{productCode}/validate")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Validate product for account creation", description = "Validates active status, term bounds, amount, and returns applicable rate and settings (Lab L13).")
    public ProductValidationResponseDto validateProduct(
            @PathVariable String productCode,
            @RequestParam(required = false) Integer termMonths,
            @RequestParam(required = false) java.math.BigDecimal amount,
            @RequestParam(required = false) String currency) {
        return productService.validateProductForAccount(productCode, termMonths, amount, currency);
    }

    @GetMapping("/{productCode}/penalty")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'STAFF', 'BANK_OFFICER', 'ADMIN')")
    @Operation(summary = "Get premature withdrawal penalty details", description = "Returns penalty percentage and flat withdrawal fee for early FD closure (Lab L15).")
    public ProductPenaltyResponseDto getPenaltyDetails(@PathVariable String productCode) {
        return productService.getPenaltyDetails(productCode);
    }
}

