package com.BankingTech.demo.dto.requestdto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class FixedDepositAccountRequestDTO {

    @NotBlank(message = "Customer ID is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "10", description = "Original customer ID from Auth, synchronized through Kafka")
    private String customerId;

    @NotBlank(message = "Product code is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "FD_STANDARD")
    private String productCode;

    /** Set by the authoritative Product & Pricing Kafka quote, never trusted from the browser. */
    private String currency;

    /*
     * Used only for account number generation.
     * It is not stored in FD_ACCOUNT.
     */
    @NotBlank(message = "Branch code is required")
    @jakarta.validation.constraints.Pattern(regexp = "\\d{3}", message = "Branch code must contain exactly 3 digits")
    @io.swagger.v3.oas.annotations.media.Schema(example = "001")
    private String branchCode;

    @NotNull(message = "Principal amount is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "10000")
    @DecimalMin(value = "0.01", message = "Principal amount must be greater than zero")
    private BigDecimal principalAmount;

    /*
     * Temporary until Product & Pricing integration.
     */
    @NotNull(message = "Interest rate is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "7")
    @DecimalMin(value = "0.0", message = "Interest rate cannot be negative")
    private BigDecimal interestRate;

    @NotNull(message = "Term in months is required")
    @Min(value = 3, message = "Term must be at least 3 months")
    @io.swagger.v3.oas.annotations.media.Schema(example = "12")
    @Positive(message = "Term must be greater than zero")
    private Integer termMonths;

    /*
     * Temporary until Product & Pricing integration.
     */
    @NotBlank(message = "Interest type is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "SIMPLE")
    private String interestType;

    /*
     * Temporary until Product & Pricing integration.
     */
    @NotBlank(message = "Interest payout type is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "CAPITALIZE")
    private String interestPayoutType;

    @NotBlank(message = "Interest frequency is required")
    @io.swagger.v3.oas.annotations.media.Schema(example = "MONTHLY")
    private String interestFrequency;

    public String getInterestFrequency() {
        return interestFrequency;
    }

    public void setInterestFrequency(String interestFrequency) {
        this.interestFrequency = interestFrequency;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public BigDecimal getPrincipalAmount() {
        return principalAmount;
    }

    public void setPrincipalAmount(BigDecimal principalAmount) {
        this.principalAmount = principalAmount;
    }

    public BigDecimal getInterestRate() {
        return interestRate;
    }

    public void setInterestRate(BigDecimal interestRate) {
        this.interestRate = interestRate;
    }

    public Integer getTermMonths() {
        return termMonths;
    }

    public void setTermMonths(Integer termMonths) {
        this.termMonths = termMonths;
    }

    public String getInterestType() {
        return interestType;
    }

    public void setInterestType(String interestType) {
        this.interestType = interestType;
    }

    public String getInterestPayoutType() {
        return interestPayoutType;
    }

    public void setInterestPayoutType(String interestPayoutType) {
        this.interestPayoutType = interestPayoutType;
    }
}
