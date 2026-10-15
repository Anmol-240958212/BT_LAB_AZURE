package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.requestdto.FDTransactionRequestDTO;
import com.BankingTech.demo.service.FDTransactionService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.BankingTech.demo.dto.responsedto.FDTransactionResponseDTO;

import java.util.List;

@RestController
@RequestMapping("/api/fd/transactions")
public class FDTransactionController {

    private final FDTransactionService fdTransactionService;

    public FDTransactionController(
            FDTransactionService fdTransactionService) {
        this.fdTransactionService = fdTransactionService;
    }

    @GetMapping
    public ResponseEntity<List<FDTransactionResponseDTO>> getTransactions(
            @RequestParam(required = false) String fdAccountNo) {
        return ResponseEntity.ok(fdTransactionService.getTransactions(fdAccountNo));
    }

    @PostMapping
    public ResponseEntity<String> createTransaction(
            @RequestBody FDTransactionRequestDTO request) {

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
