package com.BankingTech.demo.controller;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import com.BankingTech.demo.service.*;

@RestController
@RequestMapping("/api/fd/products")
public class FdProductController {
    private final FdProductCatalogueService catalogue;
    private final FdProductPricingService pricing;
    private final FdAuthKafkaClient auth;
    public FdProductController(FdProductCatalogueService catalogue, FdProductPricingService pricing, FdAuthKafkaClient auth) {
        this.catalogue = catalogue; this.pricing = pricing; this.auth = auth;
    }
    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authorizeRead(authorization);
        return catalogue.available();
    }
    @GetMapping("/{code}/quote")
    public Map<String, Object> quote(@PathVariable String code, @RequestParam BigDecimal amount, @RequestParam Integer termMonths,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        authorizeRead(authorization);
        return pricing.quote(code, amount, termMonths);
    }
    private void authorizeRead(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer "))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Sign in to view products");
        var profile = auth.profile(authorization);
        if (profile == null || profile.role() == null || !Set.of("ADMIN", "BANK_OFFICER", "CUSTOMER", "STAFF").contains(profile.role()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Product access is not permitted");
    }
}
