package com.BankingTech.demo.dto.responsedto;

import java.math.BigDecimal;

public class FDCalculationResponseDTO {

    private BigDecimal maturityAmount;

    private BigDecimal effectiveRate;

    private BigDecimal interestEarned;
    private String interestFrequency;


    public BigDecimal getMaturityAmount() {
        return maturityAmount;
    }

    public void setMaturityAmount(BigDecimal maturityAmount) {
        this.maturityAmount = maturityAmount;
    }

    public BigDecimal getEffectiveRate() {
        return effectiveRate;
    }

    public void setEffectiveRate(BigDecimal effectiveRate) {
        this.effectiveRate = effectiveRate;
    }

    public BigDecimal getInterestEarned() {
        return interestEarned;
    }

    public void setInterestEarned(BigDecimal interestEarned) {
        this.interestEarned = interestEarned;
    }

    public String getInterestFrequency() {
        return interestFrequency;
    }

    public void setInterestFrequency(String interestFrequency) {
        this.interestFrequency = interestFrequency;
    }
}
