package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.requestdto.FDTransactionRequestDTO;
import com.BankingTech.demo.service.FDTransactionService;
import com.BankingTech.demo.service.FdRoleAuthorization;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fd/transactions")
public class FDTransactionController {

    private final FDTransactionService fdTransactionService;
    private final FdRoleAuthorization roleAuthorization;

    public FDTransactionController(
            FDTransactionService fdTransactionService, FdRoleAuthorization roleAuthorization) {
        this.fdTransactionService = fdTransactionService;
        this.roleAuthorization = roleAuthorization;
    }

    @PostMapping
    public ResponseEntity<String> createTransaction(
            @RequestBody FDTransactionRequestDTO request,
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        roleAuthorization.requireStaffOperation(authorization);

        fdTransactionService.recordTransaction(
                request.getFdAccountNo(),
                request.getTxnType(),
                request.getAmount(),
                request.getPenaltyAmount(),
                request.getTxnDate(),
                request.getRemarks());

        return ResponseEntity.ok(
                "FD transaction recorded successfully");
    }
}
