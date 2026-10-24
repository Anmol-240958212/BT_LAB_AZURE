package com.BankingTech.demo.controller;

import com.BankingTech.demo.service.MaturityProcessingService;
import com.BankingTech.demo.service.FdRoleAuthorization;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/fd/maturity")
public class FDMaturityBatchController {

    private final MaturityProcessingService maturityProcessingService;
    private final FdRoleAuthorization roleAuthorization;

    public FDMaturityBatchController(
            MaturityProcessingService maturityProcessingService,
            FdRoleAuthorization roleAuthorization) {

        this.maturityProcessingService = maturityProcessingService;
        this.roleAuthorization = roleAuthorization;
    }

    @PostMapping("/process")
    public ResponseEntity<?> processMaturityBatch(
            @RequestParam(required = false) LocalDate businessDate,
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        roleAuthorization.requireAdmin(authorization);

        if (businessDate == null) {
            businessDate = LocalDate.now();
        }

        maturityProcessingService.processMaturedAccounts(
                businessDate);

        return ResponseEntity.ok(
                Map.of(
                        "status", "COMPLETED",
                        "businessDate", businessDate,
                        "message",
                        "FD maturity batch processing completed"));
    }
}
