package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import com.BankingTech.demo.dto.responsedto.FixedDepositAccountResponseDTO;
import com.BankingTech.demo.dto.responsedto.FDAccountCreationResponseDTO;
import com.BankingTech.demo.dto.requestdto.FDAccountDateAdjustmentRequestDTO;
import com.BankingTech.demo.service.FdAuthKafkaClient;
import com.BankingTech.demo.service.FixedDepositAccountService;
import com.BankingTech.demo.service.FdCreationAuthorization;
import com.BankingTech.demo.service.FdRoleAuthorization;

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
        private final FdCreationAuthorization creationAuthorization;
        private final FdAuthKafkaClient authClient;
        private final FdRoleAuthorization roleAuthorization;

        @org.springframework.beans.factory.annotation.Autowired
        public FixedDepositAccountController(
                        FixedDepositAccountService fixedDepositAccountService, FdCreationAuthorization creationAuthorization,
                        FdAuthKafkaClient authClient, FdRoleAuthorization roleAuthorization) {
                this.fixedDepositAccountService = fixedDepositAccountService;
                this.creationAuthorization = creationAuthorization;
                this.authClient = authClient;
                this.roleAuthorization = roleAuthorization;
        }

        /** Retained for existing unit tests of the creation endpoints. */
        public FixedDepositAccountController(FixedDepositAccountService fixedDepositAccountService,
                        FdCreationAuthorization creationAuthorization) {
                this(fixedDepositAccountService, creationAuthorization, null, null);
        }

        @PutMapping("/{fdAccountNo}/dates")
        public ResponseEntity<FixedDepositAccountResponseDTO> adjustDates(
                        @PathVariable String fdAccountNo,
                        @Valid @RequestBody FDAccountDateAdjustmentRequestDTO request,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                var profile = authClient.profile(authorization);
                if (!"ADMIN".equalsIgnoreCase(profile.role())) {
                        throw new org.springframework.web.server.ResponseStatusException(
                                        org.springframework.http.HttpStatus.FORBIDDEN, "Only administrators can adjust FD dates");
                }
                return ResponseEntity.ok(fixedDepositAccountService.adjustAccountDates(
                                fdAccountNo, request.openingDate(), request.maturityDate()));
        }

        @PostMapping("/create")
        public ResponseEntity<FixedDepositAccountResponseDTO> createAccount(
                        @Valid @RequestBody FixedDepositAccountRequestDTO request,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                creationAuthorization.authorize(authorization, request);

                return ResponseEntity.ok(
                                fixedDepositAccountService.createAccount(request));
        }

        // L16
        @PostMapping("/create-with-txn")
        public ResponseEntity<FDAccountCreationResponseDTO> createAccountWithTransaction(
                        @Valid @RequestBody FixedDepositAccountRequestDTO request,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                creationAuthorization.authorize(authorization, request);

                return ResponseEntity.ok(
                                fixedDepositAccountService.createAccountWithTransaction(request));
        }

        @GetMapping("/{fdAccountNo}")
        public ResponseEntity<FixedDepositAccountResponseDTO> getAccount(
                        @PathVariable String fdAccountNo,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {

                var account = fixedDepositAccountService.getAccount(fdAccountNo);
                roleAuthorization.authorizeCustomerOrStaffAccountRead(authorization, account.getCustomerId());
                return ResponseEntity.ok(account);
        }

        @GetMapping("/customer/{customerId}")
        public ResponseEntity<List<FixedDepositAccountResponseDTO>> getAccountsByCustomer(
                        @PathVariable String customerId,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {

                roleAuthorization.authorizeCustomerOrStaffAccountRead(authorization, customerId);
                return ResponseEntity.ok(
                                fixedDepositAccountService.getAccountsByCustomer(customerId));
        }

        @GetMapping("/status/{status}")
        public ResponseEntity<List<FixedDepositAccountResponseDTO>> getAccountsByStatus(
                        @PathVariable String status,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {

                roleAuthorization.requireStaffOperation(authorization);
                return ResponseEntity.ok(
                                fixedDepositAccountService.getAccountsByStatus(status));
        }

        @GetMapping("/customer/{customerId}/status/{status}")
        public ResponseEntity<List<FixedDepositAccountResponseDTO>> getCustomerAccountsByStatus(
                        @PathVariable String customerId,
                        @PathVariable String status,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {

                roleAuthorization.authorizeCustomerOrStaffAccountRead(authorization, customerId);
                return ResponseEntity.ok(
                                fixedDepositAccountService.getCustomerAccountsByStatus(
                                                customerId,
                                                status));
        }
}

