package com.example.auth.dto;

import java.util.List;

public record CustomerBenefitResponseDto(Long customerId, boolean bankEmployee,
        boolean premiumWealthCustomer, List<String> pricingCategories) {}
