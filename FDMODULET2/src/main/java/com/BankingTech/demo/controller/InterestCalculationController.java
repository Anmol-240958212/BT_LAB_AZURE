package com.BankingTech.demo.controller;

import com.BankingTech.demo.service.InterestCalculationService;
import com.BankingTech.demo.service.FdRoleAuthorization;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fd/interest")
public class InterestCalculationController {

    private final InterestCalculationService interestCalculationService;
    private final FdRoleAuthorization roleAuthorization;

    public InterestCalculationController(
            InterestCalculationService interestCalculationService,
            FdRoleAuthorization roleAuthorization) {
        this.interestCalculationService = interestCalculationService;
        this.roleAuthorization = roleAuthorization;
    }

    @PostMapping("/calculate")
    public ResponseEntity<String> calculateInterest(
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        roleAuthorization.requireAdmin(authorization);

        /*
         * Later:
         * 
         * @PreAuthorize("hasAnyRole('BANK_OFFICER', 'ADMIN')")
         */

        interestCalculationService
                .calculateInterestForActiveAccounts();

        return ResponseEntity.ok(
                "Interest calculation batch completed");
    }
}
