package com.example.auth.dto;

/** Administrative request for benefits which must never be selected by a customer. */
public record CustomerBenefitUpdateRequestDto(boolean bankEmployee, boolean premiumWealthCustomer) {}
