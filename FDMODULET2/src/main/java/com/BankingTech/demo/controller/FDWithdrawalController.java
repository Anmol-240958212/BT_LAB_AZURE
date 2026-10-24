package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.requestdto.FDWithdrawalRequestDTO;
import com.BankingTech.demo.dto.responsedto.FDWithdrawalResponseDTO;
import com.BankingTech.demo.service.FDWithdrawalService;
import com.BankingTech.demo.service.FdWithdrawalAuthorization;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/fd/account")
public class FDWithdrawalController {

    private final FDWithdrawalService fdWithdrawalService;
    private final FdWithdrawalAuthorization withdrawalAuthorization;

    public FDWithdrawalController(
            FDWithdrawalService fdWithdrawalService,
            FdWithdrawalAuthorization withdrawalAuthorization) {
        this.fdWithdrawalService = fdWithdrawalService;
        this.withdrawalAuthorization = withdrawalAuthorization;
    }

    @PostMapping("/withdraw")
    public ResponseEntity<FDWithdrawalResponseDTO> withdrawFD(
            @RequestBody @jakarta.validation.Valid FDWithdrawalRequestDTO request,
            @RequestHeader(value = "Authorization", required = false) String authorization) {

        withdrawalAuthorization.authorize(authorization, request.getFdAccountNo());

        FDWithdrawalResponseDTO response = fdWithdrawalService.processWithdrawal(
                request);

        return ResponseEntity.ok(response);
    }
}
