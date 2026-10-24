package com.BankingTech.demo.controller;

import com.BankingTech.demo.service.InterestCalculationService;
import com.BankingTech.demo.service.FdRoleAuthorization;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/fd/interest-batch")
public class FDInterestBatchController {

    private final InterestCalculationService interestCalculationService;
    private final FdRoleAuthorization roleAuthorization;

    public FDInterestBatchController(
            InterestCalculationService interestCalculationService,
            FdRoleAuthorization roleAuthorization) {
        this.interestCalculationService = interestCalculationService;
        this.roleAuthorization = roleAuthorization;
    }

    @PostMapping
    public String runInterestBatch(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        roleAuthorization.requireAdmin(authorization);

        LocalDate effectiveDate = businessDate != null
                ? businessDate
                : LocalDate.now();

        interestCalculationService
                .calculateInterestForActiveAccounts(effectiveDate);

        return "FD interest batch processed for business date "
                + effectiveDate;
    }
}
