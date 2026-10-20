package com.BankingTech.demo.service.serviceimpl;

import com.BankingTech.demo.dto.requestdto.FDCalculationRequestDTO;
import com.BankingTech.demo.dto.responsedto.FDCalculationResponseDTO;
import com.BankingTech.demo.service.FDCalculatorService;
import com.BankingTech.demo.service.plugins.calculator.CompoundInterestCalculator;
import com.BankingTech.demo.service.plugins.calculator.InterestCalculator;
import com.BankingTech.demo.service.plugins.calculator.SimpleInterestCalculator;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class FDCalculatorServiceImpl
        implements FDCalculatorService {

    private final SimpleInterestCalculator
            simpleInterestCalculator;

    private final CompoundInterestCalculator
            compoundInterestCalculator;


    /*
     * Temporary development cap.
     *
     * Later this should come from Product & Pricing.
     */
    private static final BigDecimal CATEGORY_CAP =
            BigDecimal.valueOf(2.0);

    /** The displayed and calculated effective rate can never exceed this cap. */
    private static final BigDecimal EFFECTIVE_RATE_CAP =
            BigDecimal.valueOf(8.50);


    public FDCalculatorServiceImpl(
            SimpleInterestCalculator simpleInterestCalculator,
            CompoundInterestCalculator compoundInterestCalculator
    ) {

        this.simpleInterestCalculator =
                simpleInterestCalculator;

        this.compoundInterestCalculator =
                compoundInterestCalculator;
    }


    @Override
    public FDCalculationResponseDTO calculate(
            FDCalculationRequestDTO request
    ) {

        BigDecimal categoryAddition =
                calculateCategoryAddition(
                        request.getCategories()
                );

        if (categoryAddition.compareTo(
                CATEGORY_CAP
        ) > 0) {

            throw new IllegalArgumentException(
                    "Combined category rate exceeds configured cap"
            );
        }


        BigDecimal effectiveRate =
                request.getBaseRate()
                        .add(categoryAddition)
                        .setScale(
                                4,
                                RoundingMode.HALF_UP
                        );

        // Category benefits are applied first, then the bank-wide effective-rate cap is enforced.
        // A 10% or 20% entered base rate therefore projects at 8.50%, never at zero.
        effectiveRate = effectiveRate.min(EFFECTIVE_RATE_CAP);


        InterestCalculator calculator;
        int compoundingPeriodsPerYear = compoundingPeriodsPerYear(request.getInterestFrequency());


        if ("COMPOUND".equalsIgnoreCase(
                request.getInterestType()
        )) {

            calculator =
                    compoundInterestCalculator;

        } else if ("SIMPLE".equalsIgnoreCase(
                request.getInterestType()
        )) {

            calculator =
                    simpleInterestCalculator;

        } else {

            throw new IllegalArgumentException(
                    "Unsupported interest type: "
                            + request.getInterestType()
            );
        }


        int termMonths = request.getTerm().getValue();
        if (request.getTerm().getUnit() != null) {
            String unit = request.getTerm().getUnit().toUpperCase();
            if ("YEARS".equals(unit) || "YEAR".equals(unit)) {
                termMonths = termMonths * 12;
            } else if ("DAYS".equals(unit) || "DAY".equals(unit)) {
                termMonths = Math.max(1, Math.round(termMonths / 30.417f));
            }
        }

        BigDecimal interest =
                calculator.calculate(
                        request.getPrincipal(),
                        effectiveRate,
                        termMonths,
                        compoundingPeriodsPerYear
                );


        BigDecimal maturityAmount =
                request.getPrincipal()
                        .add(interest)
                        .setScale(
                                2,
                                RoundingMode.HALF_UP
                        );


        FDCalculationResponseDTO response =
                new FDCalculationResponseDTO();

        response.setMaturityAmount(
                maturityAmount
        );

        response.setEffectiveRate(
                effectiveRate
        );

        response.setInterestEarned(
                interest
        );
        response.setInterestFrequency(normalizeFrequency(request.getInterestFrequency()));

        return response;
    }


    private BigDecimal calculateCategoryAddition(
            java.util.List<String> categories
    ) {

        /*
         * Temporary implementation.
         *
         * Actual category additions will be
         * fetched from Product & Pricing.
         */

        if (categories == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal addition =
                BigDecimal.ZERO;

        for (String category : categories) {

            String normalized = category == null ? "" : category.trim().toUpperCase().replace('-', '_').replace(' ', '_');
            if ("SENIOR".equals(normalized) || "SENIOR_CITIZEN".equals(normalized)) {

                addition =
                        addition.add(
                                new BigDecimal("0.50")
                        );

            } else if ("EMPLOYEE".equals(normalized) || "BANK_EMPLOYEE".equals(normalized)) {

                addition =
                        addition.add(
                                BigDecimal.ONE
                        );
            } else if ("PREMIUM".equals(normalized) || "PREMIUM_USER".equals(normalized)
                    || "PREMIUM_WEALTH_CUSTOMER".equals(normalized)) {
                addition = addition.add(new BigDecimal("0.25"));
            }
        }

        return addition;
    }

    private String normalizeFrequency(String frequency) {
        if (frequency == null || frequency.isBlank()) return "QUARTERLY";
        String normalized = frequency.trim().toUpperCase();
        return "ANNUALLY".equals(normalized) || "YEARLY".equals(normalized) ? "ANNUAL" : normalized;
    }

    private int compoundingPeriodsPerYear(String frequency) {
        return switch (normalizeFrequency(frequency)) {
            case "DAILY" -> 365;
            case "MONTHLY" -> 12;
            case "QUARTERLY" -> 4;
            case "HALF_YEARLY" -> 2;
            case "ANNUAL" -> 1;
            default -> throw new IllegalArgumentException("Unsupported interest frequency: " + frequency);
        };
    }
}
