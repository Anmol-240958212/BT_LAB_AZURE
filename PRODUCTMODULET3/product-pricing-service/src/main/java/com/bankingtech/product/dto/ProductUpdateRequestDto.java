package com.bankingtech.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.bankingtech.product.entity.enums.Frequency;
import com.bankingtech.product.entity.enums.RateType;
import com.bankingtech.product.entity.enums.RecordStatus;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Update body that tracks nullable properties explicitly supplied as JSON null. */
public class ProductUpdateRequestDto {
    @Size(max = 100) private String productName;
    @Size(max = 255) private String description;
    private LocalDate effectiveDate;
    private LocalDate effectiveTo;
    private RecordStatus status;
    @Valid private TermLimitDto termLimit;
    @Valid private RateLimitDto rateLimit;
    @DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal baseRate;
    private RateType rateType;
    private Frequency frequency;
    private List<@NotBlank @Size(max = 40) String> transactionTypes;
    @DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal maxAdditionalPercent;
    private boolean descriptionSupplied;
    private boolean effectiveToSupplied;

    public ProductUpdateRequestDto() { }

    @JsonProperty("productName") public String productName() { return productName; }
    @JsonProperty("description") public String description() { return description; }
    @JsonProperty("effectiveDate") public LocalDate effectiveDate() { return effectiveDate; }
    @JsonProperty("effectiveTo") public LocalDate effectiveTo() { return effectiveTo; }
    @JsonProperty("status") public RecordStatus status() { return status; }
    @JsonProperty("termLimit") public TermLimitDto termLimit() { return termLimit; }
    @JsonProperty("rateLimit") public RateLimitDto rateLimit() { return rateLimit; }
    @JsonProperty("baseRate") public BigDecimal baseRate() { return baseRate; }
    @JsonProperty("rateType") public RateType rateType() { return rateType; }
    @JsonProperty("frequency") public Frequency frequency() { return frequency; }
    @JsonProperty("transactionTypes") public List<String> transactionTypes() { return transactionTypes; }
    @JsonProperty("maxAdditionalPercent") public BigDecimal maxAdditionalPercent() { return maxAdditionalPercent; }
    public boolean descriptionSupplied() { return descriptionSupplied; }
    public boolean effectiveToSupplied() { return effectiveToSupplied; }

    public void setProductName(String value) { productName = value; }
    @JsonSetter("description") public void setDescription(String value) {
        descriptionSupplied = true;
        description = value;
    }
    public void setEffectiveDate(LocalDate value) { effectiveDate = value; }
    @JsonSetter("effectiveTo") public void setEffectiveTo(LocalDate value) {
        effectiveToSupplied = true;
        effectiveTo = value;
    }
    public void setStatus(RecordStatus value) { status = value; }
    public void setTermLimit(TermLimitDto value) { termLimit = value; }
    public void setRateLimit(RateLimitDto value) { rateLimit = value; }
    public void setBaseRate(BigDecimal value) { baseRate = value; }
    public void setRateType(RateType value) { rateType = value; }
    public void setFrequency(Frequency value) { frequency = value; }
    public void setTransactionTypes(List<String> value) { transactionTypes = value; }
    public void setMaxAdditionalPercent(BigDecimal value) { maxAdditionalPercent = value; }
}
