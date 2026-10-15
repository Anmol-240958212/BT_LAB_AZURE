package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import com.BankingTech.demo.dto.responsedto.FixedDepositAccountResponseDTO;
import com.BankingTech.demo.dto.responsedto.FDAccountCreationResponseDTO;
import com.BankingTech.demo.service.FixedDepositAccountService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/fd/account")
@Tag(name = "FD accounts", description = "Create accounts for Kafka-synchronized customers with ACTIVE KYC")
public class FixedDepositAccountController {

        private final FixedDepositAccountService fixedDepositAccountService;

        public FixedDepositAccountController(
                        FixedDepositAccountService fixedDepositAccountService) {
                this.fixedDepositAccountService = fixedDepositAccountService;
        }

        @PostMapping("/create")
        public ResponseEntity<FixedDepositAccountResponseDTO> createAccount(
                        @Valid @RequestBody FixedDepositAccountRequestDTO request) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.createAccount(request));
        }

        // L16
        @PostMapping("/create-with-txn")
        public ResponseEntity<FDAccountCreationResponseDTO> createAccountWithTransaction(
                        @Valid @RequestBody FixedDepositAccountRequestDTO request) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.createAccountWithTransaction(request));
        }

        @PutMapping("/{fdAccountNo}/approve")
        public ResponseEntity<FixedDepositAccountResponseDTO> approveAccount(
                        @PathVariable String fdAccountNo) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.approveAccount(fdAccountNo));
        }

        @GetMapping("/{fdAccountNo}")
        public ResponseEntity<FixedDepositAccountResponseDTO> getAccount(
                        @PathVariable String fdAccountNo) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.getAccount(fdAccountNo));
        }

        @GetMapping("/customer/{customerId}")
        public ResponseEntity<List<FixedDepositAccountResponseDTO>> getAccountsByCustomer(
                        @PathVariable String customerId) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.getAccountsByCustomer(customerId));
        }

        @GetMapping("/status/{status}")
        public ResponseEntity<List<FixedDepositAccountResponseDTO>> getAccountsByStatus(
                        @PathVariable String status) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.getAccountsByStatus(status));
        }

        @GetMapping("/customer/{customerId}/status/{status}")
        public ResponseEntity<List<FixedDepositAccountResponseDTO>> getCustomerAccountsByStatus(
                        @PathVariable String customerId,
                        @PathVariable String status) {

                return ResponseEntity.ok(
                                fixedDepositAccountService.getCustomerAccountsByStatus(
                                                customerId,
                                                status));
        }
}
