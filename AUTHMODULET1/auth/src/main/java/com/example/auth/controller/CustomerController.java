package com.example.auth.controller;

import com.example.auth.dto.CustomerProfileRequestDto;
import com.example.auth.dto.CustomerProfileResponseDto;
import com.example.auth.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/customer")
@Tag(name = "Customer Management", description = "Customer profile, KYC, and account management APIs. Requires JWT authentication.")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private com.example.auth.service.CustomerEventSyncService customerEventSyncService;

    @Autowired
    private com.example.auth.service.CustomerBenefitService customerBenefitService;

    @PutMapping("/{customerId}/pricing-benefits")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_ADMIN')")
    @Operation(summary = "Assign verified pricing benefits", description = "Only an administrator may mark a customer as a verified bank employee or premium-wealth customer.", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<com.example.auth.dto.CustomerBenefitResponseDto> updatePricingBenefits(
            @PathVariable Long customerId,
            @RequestBody com.example.auth.dto.CustomerBenefitUpdateRequestDto request,
            Authentication authentication) {
        return ResponseEntity.ok(customerBenefitService.update(customerId, request, authentication.getName()));
    }

    @GetMapping("/{customerId}/pricing-benefits")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'HEAD_ADMIN')")
    public ResponseEntity<com.example.auth.dto.CustomerBenefitResponseDto> getPricingBenefits(@PathVariable Long customerId) {
        return ResponseEntity.ok(customerBenefitService.get(customerId));
    }

    @PostMapping("/sync")
    @Operation(summary = "Synchronize approved customer and registered email to FD through Kafka",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<?> syncCustomer(Authentication authentication) {
        customerEventSyncService.sync(authentication.getName());
        return ResponseEntity.accepted().body(java.util.Map.of("message", "Customer snapshot submitted to Kafka"));
    }

    @PostMapping("/profile")
    @Operation(summary = "Submit customer KYC profile",
               description = "Submits or updates the KYC profile for the currently authenticated customer.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "KYC profile submitted/updated successfully."),
        @ApiResponse(responseCode = "400", description = "Invalid request body."),
        @ApiResponse(responseCode = "401", description = "Unauthorized. Invalid or missing JWT.")
    })
    public ResponseEntity<CustomerProfileResponseDto> submitProfile(
            @RequestBody CustomerProfileRequestDto request,
            Authentication authentication) {

        String username = authentication.getName();
        CustomerProfileResponseDto response = customerService.submitKycProfile(request, username);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    @Operation(summary = "Get customer KYC profile",
               description = "Retrieves the KYC profile of the currently authenticated customer.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "KYC profile retrieved successfully."),
        @ApiResponse(responseCode = "401", description = "Unauthorized. Invalid or missing JWT.")
    })
    public ResponseEntity<CustomerProfileResponseDto> getProfile(Authentication authentication) {
        String username = authentication.getName();
        CustomerProfileResponseDto response = customerService.getCustomerProfile(username);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    @Operation(summary = "Get customer status",
               description = "Retrieves the account status of the currently authenticated customer.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Customer status retrieved successfully."),
        @ApiResponse(responseCode = "401", description = "Unauthorized. Invalid or missing JWT.")
    })
    public ResponseEntity<java.util.Map<String, String>> getCustomerStatus(Authentication authentication) {
        String username = authentication.getName();
        String status = customerService.getCustomerStatus(username);
        return ResponseEntity.ok(java.util.Map.of("status", status));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'HEAD_ADMIN')")
    @Operation(summary = "Get all customers",
               description = "Retrieves a list of all customers (requires admin privileges).",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "List of customers retrieved successfully."),
        @ApiResponse(responseCode = "401", description = "Unauthorized. Invalid or missing JWT.")
    })
    public ResponseEntity<java.util.List<CustomerProfileResponseDto>> getAllCustomers(Authentication authentication) {
        String username = authentication.getName();
        java.util.List<CustomerProfileResponseDto> response = customerService.getAllCustomers(username);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/account")
    @Operation(summary = "Open a new customer account",
               description = "Opens a new bank account for the currently authenticated customer.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Account opened successfully."),
        @ApiResponse(responseCode = "400", description = "Invalid request body."),
        @ApiResponse(responseCode = "401", description = "Unauthorized. Invalid or missing JWT.")
    })
    public ResponseEntity<com.example.auth.dto.OpenAccountResponseDto> openAccount(
            @RequestBody com.example.auth.dto.OpenAccountRequestDto request,
            Authentication authentication) {

        String username = authentication.getName();
        com.example.auth.dto.OpenAccountResponseDto response = customerService.openAccount(request, username);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/account")
    @Operation(summary = "Get customer accounts",
               description = "Retrieves a list of all accounts of the currently authenticated customer.",
               security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "List of accounts retrieved successfully."),
        @ApiResponse(responseCode = "401", description = "Unauthorized. Invalid or missing JWT.")
    })
    public ResponseEntity<java.util.List<com.example.auth.dto.OpenAccountResponseDto>> getAccounts(Authentication authentication) {
        String username = authentication.getName();
        java.util.List<com.example.auth.dto.OpenAccountResponseDto> response = customerService.getAccounts(username);
        return ResponseEntity.ok(response);
    }
}
