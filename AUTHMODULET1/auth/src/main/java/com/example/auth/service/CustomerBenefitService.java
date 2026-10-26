package com.example.auth.service;

import com.example.auth.dto.CustomerBenefitResponseDto;
import com.example.auth.dto.CustomerBenefitUpdateRequestDto;

public interface CustomerBenefitService {
    CustomerBenefitResponseDto update(Long customerId, CustomerBenefitUpdateRequestDto request, String actorUsername);
    CustomerBenefitResponseDto get(Long customerId);
}
